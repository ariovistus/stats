import { autoinject } from "aurelia-framework";
import { EventEntity, EventMatchEntity, TeamEntity, EventTeamEntity, TeamMatch2020Entity, FrcStatsContext } from "../../persistence";
import { DialogService } from "aurelia-dialog";
import * as naturalSort from "javascript-natural-sort";
import { makeTeamStats, RechargeTeamStatistics } from "./statistics";
import { gameManager } from "../index";

@autoinject 
export class EventTeamsPage {
  public event: EventEntity;
  public eventMatches: EventMatchEntity[];
  public teams: {team: TeamEntity, eventTeam: EventTeamEntity}[];
  public matches2020: TeamMatch2020Entity[];
  public activeTab: number;
  public teamsData: RechargeTeamStatistics[];
  public gameName: string;
  public showDevStuff: boolean;
  public noCycleTime = 160.0
  public noClimbTime = 999.0

  constructor(
    private dbContext: FrcStatsContext,
    private dialogService: DialogService
  ){
    this.teams = [];
    this.eventMatches = [];
    this.matches2020 = [];
    this.activeTab = 0;
    this.showDevStuff = false;
  }

  public async activate(params) {
    let game = gameManager.getGame(params.year);
    this.gameName = game.name;
    this.event = await this.dbContext.getEvent(params.year, params.eventCode);
    await this.getEventMatches();
    await this.getEventTeams();
    await this.get2020Matches();
  }

  private async getEventTeams() {
    let eventTeams = await this.dbContext.getEventTeams(this.event.year, this.event.eventCode);
    var gettingTeams = eventTeams.map(eventTeam => {
      return this.dbContext.getTeam(eventTeam.teamNumber).then(team => {
          this.teams.push({ team: team, eventTeam: eventTeam });
        });
    });

    await Promise.all(gettingTeams);
    this.teams.sort((a, b) => naturalSort(a.team.teamNumber, b.team.teamNumber));
  }

  private async getEventMatches() {
    let eventMatches = await this.dbContext.getEventMatches(this.event.year, this.event.eventCode);
    this.eventMatches = eventMatches;
    this.eventMatches.sort((a, b) => naturalSort(a.matchNumber, b.matchNumber));
  }

  private async get2020Matches() {
    this.matches2020 = await this.dbContext.teamMatches2020.where("eventCode").equals(this.event.eventCode).toArray();
    this.matches2020.sort((a, b) => naturalSort(a.matchNumber, b.matchNumber));

    let teamMatches = new Map<string, TeamMatch2020Entity[]>();
    for(var teamMatch of this.matches2020) {
      if(!teamMatches.has(teamMatch.teamNumber)) {
        teamMatches.set(teamMatch.teamNumber, [teamMatch])
      }else {
        teamMatches.get(teamMatch.teamNumber).push(teamMatch);
      }
    }
    this.teamsData = this.teams.map(x => makeTeamStats(x.team, teamMatches.get(x.team.teamNumber) || []));
  }

  public showDevValues() {
    this.showDevStuff = !this.showDevStuff;
  }

  public sortByTeamNumber() {
    this.teamsData.sort((a,b) => naturalSort(a.teamNumber, b.teamNumber));
  }

  public sortByAvgTotalScore() {
    this.teamsData.sort((a,b) => b.avgTotalScore - a.avgTotalScore);
  }
  public sortByMaxTotalScore() {
    this.teamsData.sort((a,b) => b.maxTotalScore - a.maxTotalScore);
  }

  public sortByAvgGamepieceScore() {
    this.teamsData.sort((a,b) => b.avgGamepieceScore - a.avgGamepieceScore);
  }

  public sortByMaxGamepieceScore() {
    this.teamsData.sort((a,b) => b.maxGamepieceScore - a.maxGamepieceScore);
  }

  public sortByHatchPickup() {
    this.teamsData.sort((a,b) => b.hatchPanelPickup.numeric - a.hatchPanelPickup.numeric);
  }

  public sortByCount() {
    this.teamsData.sort((a,b) => b.avgGamepieceCount - a.avgGamepieceCount);
  }

  public sortByMaxCount() {
    this.teamsData.sort((a,b) => b.maxGamepieceCount - a.maxGamepieceCount);
  }

  public sortByAutoCount() {
    this.teamsData.sort((a,b) => b.avgGamepieceAutoCount - a.avgGamepieceAutoCount);
  }

  public sortByMaxAutoCount() {
    this.teamsData.sort((a,b) => b.maxGamepieceAutoCount - a.maxGamepieceAutoCount);
  }

  public sortByAvgLow() {
    this.teamsData.sort((a,b) => b.avgLowGoalCount - a.avgLowGoalCount);
  }

  public sortByAvgHigh() {
    this.teamsData.sort((a,b) => b.avgHighGoalCount - a.avgHighGoalCount);
  }

  public sortByAvgHighInner() {
    this.teamsData.sort((a,b) => b.avgHighInnerGoalCount - a.avgHighInnerGoalCount);
  }

  public sortByClimbTime() {
    this.teamsData.sort((a,b) => a.avgClimbTime - b.avgClimbTime);
  }

  public sortByRotationTime() {
    this.teamsData.sort((a,b) => a.rotationAvgTime - b.rotationAvgTime);
  }

  public sortByPositionTime() {
    this.teamsData.sort((a,b) => a.positionAvgTime - b.positionAvgTime);
  }

  public sortByClimb() {
    this.teamsData.sort((a,b) => {
      let x = b.climbSuccesses - a.climbSuccesses;
      if(x == 0) {
        return b.climbAttempts - a.climbAttempts;
      }else {
        return x;
      }
    });
  }

  public sortByRotations() {
    this.teamsData.sort((a,b) => {
      let x = b.rotationSuccesses - a.rotationSuccesses;
      if(x == 0) {
        return b.rotationAttempts - a.rotationAttempts;
      }else {
        return x;
      }
    });
  }

  public sortByPositions() {
    this.teamsData.sort((a,b) => {
      let x = b.positionSuccesses - a.positionSuccesses;
      if(x == 0) {
        return b.positionAttempts - a.positionAttempts;
      }else {
        return x;
      }
    });
  }

  public sortByLift() {
    this.teamsData.sort((a,b) => b.liftCount - a.liftCount);
  }
}
