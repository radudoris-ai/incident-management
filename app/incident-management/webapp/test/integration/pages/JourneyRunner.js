sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"ns/incidentmanagement/test/integration/pages/IncidentsList",
	"ns/incidentmanagement/test/integration/pages/IncidentsObjectPage",
	"ns/incidentmanagement/test/integration/pages/Incidents_conversationObjectPage"
], function (JourneyRunner, IncidentsList, IncidentsObjectPage, Incidents_conversationObjectPage) {
    'use strict';

    var runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('ns/incidentmanagement') + '/test/flp.html#app-preview',
        pages: {
			onTheIncidentsList: IncidentsList,
			onTheIncidentsObjectPage: IncidentsObjectPage,
			onTheIncidents_conversationObjectPage: Incidents_conversationObjectPage
        },
        async: true
    });

    return runner;
});

