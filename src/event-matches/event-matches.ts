import { autoinject } from "aurelia-framework"
import * as naturalSort from "javascript-natural-sort";
import { DialogService } from "aurelia-dialog";
import { 
  EventEntity, FrcStatsContext, EventTeamEntity, 
  TeamEntity, EventMatchEntity, IEventTeamMatch } from "../persistence";
import { MatchDialog } from "./match-dialog";
import { ModeDialog } from "./mode-dialog";
import { ConfirmDialog } from "./confirm-dialog";
import { EventTeamData, MatchData } from "../model";
import { gameManager } from "../games/index";
import { SMEListDialog } from "./sme-list-dialog";

@autoinject
export class EventMatches {
  public event: EventEntity;
  public eventMatches: EventMatchEntity[];
  public teams: {team: TeamEntity, eventTeam: EventTeamEntity}[];
  public eventTeamMatches: IEventTeamMatch[];
  public activeTab: number;
  public teamsData: EventTeamData[];
  public gameName: string;
  public beesechurger: boolean;
  public scoutingTeams: Set<string>;

  constructor(
    private dbContext: FrcStatsContext,
    private dialogService: DialogService
  ){
    this.teams = [];
    this.eventMatches = [];
    this.eventTeamMatches = [];
    this.activeTab = 0;
  }
   
  async activate(params) {
    let game = gameManager.getGame(params.year);
    this.gameName = game.name;
    this.beesechurger = game.eventMatchModule != null;

    await this.getEvent(params);
    await Promise.all([
      this.getEventMatches(),
      this.getEventTeams(),
    ]);
    await this.getEventTeamMatches(params.year);
  }
  
  add()
  {
    this.dialogService.open({
      viewModel: MatchDialog,
      model: ({
        year: this.event.year,
        eventCode: this.event.eventCode,
        teams: this.teams.map(x => x.team),
        mode: "add",
      }),
    }).whenClosed(() => {
      this.getEventMatches()
    });
  }

  edit(match: EventMatchEntity)
  {
    this.dialogService.open({
      viewModel: MatchDialog,
      model: ({
        year: match.year,
        eventCode: match.eventCode,
        matchNumber: match.matchNumber,
        teams: this.teams.map(x => x.team),
        mode: "edit",
      }),
    }).whenClosed(() => {
      this.getEventMatches()
    });
  }

  async getEvent(params) {
    this.event = await this.dbContext.getEvent(params.year, params.eventCode);
    
    this.scoutingTeams = new Set();
    if(this.event.smes != null && this.event.smes.get(this.event.selectedSME) != null) {
      let teams = this.event.smes.get(this.event.selectedSME);
      for(var team2 of teams) {
        this.scoutingTeams.add(team2)
      }
    }
  }

  async getEventTeams() {
    let eventTeams = await this.dbContext.getEventTeams(this.event.year, this.event.eventCode);
    var gettingTeams = eventTeams.map(async eventTeam => {
      let team = await this.dbContext.teams.where("teamNumber").equals(eventTeam.teamNumber).first();
      this.teams.push({ team: team, eventTeam: eventTeam });
    });

    await Promise.all(gettingTeams);
    this.teams.sort((a, b) => naturalSort(a.team.teamNumber, b.team.teamNumber));
  }

  async getEventMatches() {
    this.eventMatches = await this.dbContext.getEventMatches(this.event.year, this.event.eventCode);
    this.eventMatches.sort((a, b) => naturalSort(a.matchNumber, b.matchNumber));
    await this.getEventTeamMatches(this.event.year);
  }

  async getEventTeamMatches(year: string) {
    let game = gameManager.getGame(year);
    this.eventTeamMatches = await game.getEventTeamMatches(this.event.eventCode);
  }

  remove(eventMatch){
    ConfirmDialog.open(this.dialogService, {
      message: "Are you SURE that you want to delete that?",
      confirmMessage: "Press 'OKAY' to confirm",
    }).whenClosed(dialogResult => {
      if(! dialogResult.wasCancelled){
        this.dbContext.eventMatches.delete(eventMatch.id).then(() => {
          this.getEventMatches();
        }).then(() => {
          let game = gameManager.getGame(this.event.year);
          return game.deleteMatch(this.event.eventCode, eventMatch.matchNumber);
        }).then(() => {
          this.getEventTeamMatches(this.event.year);
        });
      }
    });
  }

  public scouted(eventMatch: EventMatchEntity, teamNumber: string) {
    var result = this.eventTeamMatches.filter(match => 
      match.eventCode == eventMatch.eventCode && 
      match.matchNumber == eventMatch.matchNumber &&
      match.teamNumber == teamNumber).length != 0;

    return result;
  }

  public smeScouts(eventMatch: EventMatchEntity, teamNumber: string) {
    return this.scoutingTeams.has(teamNumber);
  }

  public editMode() {
    ModeDialog.open(this.dialogService, this.event).whenClosed(async () => {
      await this.getEvent({year: this.event.year, eventCode: this.event.eventCode});
    });
  }

  public showSMEList() {
    SMEListDialog.open(this.dialogService, this.event);
  }
}
