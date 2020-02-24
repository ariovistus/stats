import { autoinject } from "aurelia-framework";
import { FrcStatsContext, TeamEntity, EventMatchSlots, EventMatchEntity, EventEntity, EventMatchSlot } from "../../persistence";
import * as naturalSort from "javascript-natural-sort";
import { RechargeTeamStatistics, makeTeamStats } from "./statistics";
import { MatchAndStats } from "./model";

@autoinject
export class viewPage {
    public event: EventEntity;
    public eventMatch: EventMatchEntity;
    public teams: {
        team: TeamEntity, slot: EventMatchSlot,
        ms: MatchAndStats[], stats: RechargeTeamStatistics
    }[];

    constructor(private dbContext: FrcStatsContext) {
    }

    private async getEventTeams() {
      this.teams = []
      for(var i = 0; i < EventMatchSlots.length; i++) {
        let element = EventMatchSlots[i];
        let index = element.prop;
        let teamNum = this.eventMatch[index];
        await this.dbContext.getTeam(teamNum).then(team => {
          this.teams.push({ team: team, slot: element, ms: [], stats: null })
        });
      }
    }
    private async getTeamMatches() {
      for(var team of this.teams){
        let matches = await this.dbContext.teamMatches2020
          .where(["eventCode", "teamNumber"])
          .equals([this.event.eventCode, team.team.teamNumber]).toArray();
        matches.sort((a, b) => naturalSort(a.matchNumber, b.matchNumber));
        team.stats=makeTeamStats(team.team, matches)
        for(var match of matches) {
          let stats = makeTeamStats(team.team, [match]);
          team.ms.push({
            match: match,
            stats: stats,
          })
        }
      }
    }
    public async activate(
        params: any
    ) {
        this.event = await this.dbContext.getEvent(params.year, params.eventCode);
        this.eventMatch = await this.dbContext.getEventMatch(params.year, params.eventCode, params.matchNumber);
        await this.getEventTeams();
        await this.getTeamMatches();
    }
}
