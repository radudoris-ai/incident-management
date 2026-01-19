const cds = require('@sap/cds')

class ProcessorService extends cds.ApplicationService {
  /** Registering custom event handlers */
  async init() {
    this.before("UPDATE", "Incidents", (req) => this.onUpdate(req));
    this.before("CREATE", "Incidents", (req) => this.changeUrgencyDueToSubject(req.data));
    this.on('READ', 'Customers', (req, next) => this.onCustomerRead(req, next));
    this.on(['CREATE', 'UPDATE'], 'Incidents', (req, next) => this.onCustomerCache(req, next));

    this.S4bupa = await cds.connect.to('API_BUSINESS_PARTNER');
    this.remoteService = await cds.connect.to('RemoteService');

    return super.init();
  }

  changeUrgencyDueToSubject(data) {
    let urgent = data.title?.match(/urgent/i)
    if (urgent) data.urgency_code = 'H'
  }

  /** Custom Validation */
  async onUpdate(req) {
    let closed = await SELECT.one(1).from(req.subject).where`status.code = 'C'`
    if (closed) req.reject`Can't modify a closed incident!`
    // comment for test
  }

  async onCustomerRead(req, next) {
    console.log('>> delegate to S4 service...', req.query);
    const top = parseInt(req._queryOption?.$top) || 100;
    const skip = parseInt(req._queryOption?.$skip) || 0;

    // If remote service not ready → let CAP continue normally
    if (!this.remoteService) {
      console.log('Remote not ready');
      return next();
    }

  
    const { A_BusinessPartner } = this.S4bupa.entities;
    let result = await this.S4bupa.run(SELECT.from(A_BusinessPartner, bp => {
      bp('*'),
        bp.to_BusinessPartnerAddress(address => {
          //   address('email'),
          address.to_EmailAddress(emails => {
            emails('EmailAddress');
          });
        })
    }).limit(top, skip));

  console.log(result);
    result = result.map((bp) => ({
      ID: bp.ID,
      name: bp.BusinessPartnerName,
      email: bp.to_BusinessPartnerAddress[0]?.to_EmailAddress[0]?.EmailAddress
    }));

     /*
  const { BusinessPartner } = this.remoteService.entities;
    // Expands are required as the runtime does not support path expressions for remote services 
    let result = await this.S4bupa.run(SELECT.from(A_BusinessPartner, bp => {
      bp('*'),
        bp.addresses(address => {
          //   address('email'),
          address.email(emails => {
            emails('email');
          });
        })
    }).limit(top, skip));
   

    console.log(result);
    result = result.map((bp) => ({
      ID: bp.ID,
      name: bp.name,
      email: bp.addresses[0]?.email[0]?.email
    }));
     */

    // Explicitly set $count so the values show up in the value help in the UI
    result.$count = 1000;
    console.log("after result", result);
    return result;

  }

  async onCustomerCache(req, next) {
    const { Customers } = this.entities;
    const newCustomerId = req.data.customer_ID;
    const result = await next();

    // If remote service not ready → let CAP continue normally
    if (!this.remoteService) {
      return next()
    }
    const { BusinessPartner } = this.remoteService.entities;
    if (newCustomerId && (newCustomerId !== "") && ((req.event == "CREATE") || (req.event == "UPDATE"))) {
      console.log('>> CREATE or UPDATE customer!');

      // Expands are required as the runtime does not support path expressions for remote services
      const customer = await this.S4bupa.run(SELECT.one(BusinessPartner, bp => {
        bp('*'),
          bp.addresses(address => {
            //     address('email', 'phoneNumber'),
            address.email(emails => {
              emails('email')
            }),
              address.phoneNumber(phoneNumber => {
                phoneNumber('phone')
              })
          })
      }).where({ ID: newCustomerId }));

      if (customer) {
        customer.email = customer.addresses[0]?.email[0]?.email;
        customer.phone = customer.addresses[0]?.phoneNumber[0]?.phone;
        delete customer.addresses;
        delete customer.name;
        await UPSERT.into(Customers).entries(customer);
      }
    }
    return result;
  }

}
module.exports = { ProcessorService }
