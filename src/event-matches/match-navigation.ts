import { EventMatchSlots, EventEntity, FrcStatsContext, EventMatchEntity } from "../persistence";
import { Router } from "aurelia-router";

export async function gotoMatch(model: GotoMatchModel) {
  let event = model.event;
  let eventMatch = model.eventMatch;
  let currentTeamNumber = model.currentTeamNumber;
  let dbContext = model.dbContext;
  let matchNumber = model.matchNumber;
  let router = model.router;

  if (event.scoutingMode == "swimlanes") {
    let eventCode = event.eventCode;
    let year = event.year;
    let slot = EventMatchSlots.filter(slot =>
      eventMatch[slot.prop] == currentTeamNumber
    )[0];
    let nextEventMatch = await dbContext.getEventMatch(event.year, event.eventCode, matchNumber);
    let teamNumber = nextEventMatch[slot.prop];

    router.navigateToRoute("match-team", {
      year: year,
      eventCode: eventCode,
      teamNumber: teamNumber,
      matchNumber: matchNumber,
    });
  } else if (event.scoutingMode == "smes") {
    let eventCode = event.eventCode;
    let year = event.year;
    let nextEventMatch = await dbContext.getEventMatch(event.year, event.eventCode, matchNumber);
    let scoutedTeamList = event.smes.get(event.selectedSME);
    let teamNumber = null;
    let found = false;
    for (var slot of EventMatchSlots) {
      teamNumber = nextEventMatch[slot.prop];
      if (scoutedTeamList.some(x => x == teamNumber)) {
        found = true;
        break;
      }
    }
    if (found) {

      router.navigateToRoute("match-team", {
        year: year,
        eventCode: eventCode,
        teamNumber: teamNumber,
        matchNumber: matchNumber,
      });
    }

  }
}


export interface GotoMatchModel {
  dbContext: FrcStatsContext;
  router: Router;
  event: EventEntity;
  eventMatch: EventMatchEntity;
  currentTeamNumber: string;
  matchNumber: string;
}
