import { autoinject } from "aurelia-framework";
import { PLATFORM } from "aurelia-pal";
import * as naturalSort from "javascript-natural-sort";

import { IGame, gameManager, IEventJson, IMergeState, IEventXLSX } from "../index";
import { validateEventTeamMatches, getTeamNumbers } from "../merge-utils";
import { FrcStatsContext, EventMatchEntity, IEventTeamMatch, TeamMatch2020Entity, EventEntity } from "../../persistence";
import { JsonExporter } from "./event-to-json";
import { Match2020MergeState } from "./model";
import { Match2020MergeDialog } from "./merge-dialog";

export interface DeepSpaceEventJson extends IEventJson{
  matches2020: TeamMatch2020Entity[]
}

@autoinject
class DeepSpaceGame implements IGame {
  public gameCode = "2020";
  public year = "2020";
  public name = "INFINITE RECHARGE";
  public matchInputModule = PLATFORM.moduleName("games/recharge/match-input");
  public eventTeamsModule = PLATFORM.moduleName("games/recharge/event-teams");
  public eventTeamModule = PLATFORM.moduleName("games/recharge/event-team");
  public eventMatchModule = PLATFORM.moduleName("games/recharge/hermes");

  constructor(
    private dbContext: FrcStatsContext,
    private jsonExporter: JsonExporter) {
  }

  mergeDialogClass() {
    return Match2020MergeDialog;
  }

  async exportEventJson(event): Promise<DeepSpaceEventJson> {
    //throw new Error("implement");
    return await this.jsonExporter.eventToJson(event);
  }

  async exportEventXLSX(event: EventEntity): Promise<IEventXLSX> {
    return {
      teams: [],
      eventTeams: [],
      event: null,
      eventMatches: []
    };
  }

  setJsonEventTeamMatch(json: any, match) {
    json['matches2020'] = [match];
  }

  getEventTeamMatches(eventCode): Promise<IEventTeamMatch[]> {
    return this.dbContext.getTeamMatches2020({ eventCode: eventCode }).then(matches => {
      matches.sort((a, b) => naturalSort(a.matchNumber, b.matchNumber));
      return matches;
    });
  }

  clearIds(json: DeepSpaceEventJson) {
    json.matches2020.forEach(x => delete x.id);
  }

  async beginMerge(json: DeepSpaceEventJson): Promise<Match2020MergeState[]> {
    if (json.event.year != this.gameCode) {
      throw new Error("invalid json mergement");
    }
    let matches2020Merge = [];
    const fromDbMatches2020 = await this.dbContext.getTeamMatches2020({ eventCode: json.event.eventCode });
    ;
    fromDbMatches2020.forEach(match2020 => {
      let state = Match2020MergeState.makeFromDb(match2020);
      state.localSaved = match2020;
      matches2020Merge.push(state);
    });
    json.matches2020.forEach(match2020 => {
      let states = matches2020Merge.filter(a => a.matchNumber == match2020.matchNumber && a.teamNumber == match2020.teamNumber);
      if (states.length != 0) {
        let state_1 = states[0];
        state_1.fromFile = match2020;
      }
      else {
        let state_2 = Match2020MergeState.makeFromFile(match2020);
        matches2020Merge.push(state_2);
      }
    });
    for (var state_3 of matches2020Merge) {
      state_3.setSameness();
    }
    matches2020Merge.sort((a, b) => naturalSort(a.matchNumber, b.matchNumber));
    return matches2020Merge;
  }

  completeMerge(matches2020Merge: Match2020MergeState[]): Promise<any> {
    return Promise.all(
      matches2020Merge.map(async state => {
        if (!state.resolved) {
          console.error("item not resolved", state);
          throw new Error("item not resolved");
        }
        if (state.same || state.takeLocal) {
          return;
        } else if (state.takeFromFile) {
          // add record from file
          await this.dbContext.teamMatches2020.put(state.fromFile);
        } else if (!state.takeLocal && !state.takeFromFile && state.localSaved != null && state.fromFile == null) {
          // delete record from db
          await this.dbContext.teamMatches2020.delete(state.localSaved.id);
        } else if (state.merged != null) {
          state.merged.id = state.localSaved.id;
          await this.dbContext.teamMatches2020.put(state.merged);
        } else {
          throw new Error("crumb! we missed a case!");
        }
      }));
  }

  getTables(): any[] {
    return [this.dbContext.teamMatches2020];
  }

  importSimple(json: DeepSpaceEventJson): Promise<any> {
    return this.dbContext.teamMatches2020.bulkPut(json.matches2020);
  }

  deleteEvent(json: DeepSpaceEventJson|EventEntity): Promise<any> {
    let event: EventEntity;
    if(('event' in json)) {
      event = json.event;
    }else{
      event = json;
    }
    return this.dbContext.getTeamMatches2020({ eventCode: event.eventCode })
      .then(localMatches => {
        return this.dbContext.teamMatches2020.bulkDelete(localMatches.map(x => x.id));
      });
  }

  validateEventTeamMatches(json: any): string[] {
    return validateEventTeamMatches(json, json.matches2020, "matches2020");
  }

  updateMatch(matchP: EventMatchEntity, oldMatchNumber: string): Promise<any> {
    let teamNumbers = getTeamNumbers(matchP);
    return this.dbContext.getTeamMatches2020({ eventCode: matchP.eventCode, matchNumber: oldMatchNumber })
      .then(matches => {
        let saveMatches = [];
        let deleteMatches = [];
        for (var match of matches) {
          if (!teamNumbers.has(match.teamNumber)) {
            deleteMatches.push(match.id);
          } else if (oldMatchNumber != matchP.matchNumber) {
            match.matchNumber = matchP.matchNumber;
            saveMatches.push(match);
          }
        }

        return Promise.all([
          this.dbContext.teamMatches2020.bulkPut(saveMatches),
          this.dbContext.teamMatches2020.bulkDelete(deleteMatches),
        ]);
      }).then(() => "yup");
  }

  deleteMatch(eventCode: string, oldMatchNumber: string): Promise<any> {
    return this.dbContext.getTeamMatches2020({ eventCode: eventCode, matchNumber: oldMatchNumber })
      .then(matches => {
        let deleteMatches = matches.map(m => m.id)

        return this.dbContext.teamMatches2020.bulkDelete(deleteMatches);
      }).then(() => "yup");
  }

  deleteTeamMatch(eventCode: string, oldMatchNumber: string, teamNumber: string): Promise<any> {
    return this.dbContext.getTeamMatches2020({
      eventCode: eventCode,
      matchNumber: oldMatchNumber,
      teamNumber: teamNumber
    }).then(matches => {
      let deleteMatches = matches.map(m => m.id)

      return this.dbContext.teamMatches2020.bulkDelete(deleteMatches);
    }).then(() => "yup");
  }
}

export function configure(config) {
  var game = config.container.get(DeepSpaceGame);
  gameManager.registerGame(game);
}

