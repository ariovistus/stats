import { autoinject } from "aurelia-framework";
import * as naturalSort from "javascript-natural-sort";
import { RechargeTeamStatistics, makeTeamStats } from "./statistics"

import {
  TeamEntity, FrcStatsContext,
  EventMatchEntity, EventTeamEntity, EventEntity,
  TeamMatch2020Entity,
  EventMatchSlots
} from "../../persistence";
import { MatchAndStats } from "./model";

@autoinject
export class EventTeam {
  public team: TeamEntity;
  public eventTeam: EventTeamEntity;
  public event: EventEntity;
  public matches2020: TeamMatch2020Entity[];
  public eventMatches: EventMatchEntity[];
  public activeTab: number = 0;
  public matchTotal: number = 0;
  public foulTotal: number = 0;
  public isTrue: boolean;
  public matchStats: MatchAndStats[];

  constructor(private dbContext: FrcStatsContext) {
    this.matches2020 = [];
    this.isTrue = true;
  }

  async activate(params) {
    await this.getTeam(params);
    await this.getEventTeam(params);
    await this.getEvent(params);
    await this.getEventMatches();
    await this.getMatchData();
    this.getStats();
  }

  async getTeam(params) {
    this.team = await this.dbContext.getTeam(params.teamNumber);
  }

  getStats() {
    this.matchStats = [];
    this.matchStats.length = this.matches2020.length;
    for(var i = 0; i < this.matchStats.length; i++) {
      this.matchStats[i] = {
        match: this.matches2020[i],
        stats: makeTeamStats(this.team, [
          this.matches2020[i]
        ])
      };
    }
  }

  async getEvent(params) {
    this.event = await this.dbContext.getEvent(params.year, params.eventCode)
  }

  async getEventTeam(params) {
    this.eventTeam = await this.dbContext.eventTeams
      .where(["year", "eventCode", "teamNumber"])
      .equals([params.year, params.eventCode, params.teamNumber]).first();
  }

  async getEventMatches() {
    this.eventMatches = [];
    let allEventMatches = await this.dbContext.getEventMatches(this.eventTeam.year, this.eventTeam.eventCode);
    allEventMatches.forEach(eventMatch => {
      if (EventMatchSlots.some(slot => eventMatch[slot.prop] == this.eventTeam.teamNumber)) {
        this.eventMatches.push(eventMatch);
      }
    })
    this.eventMatches.sort((a, b) => naturalSort(a.matchNumber, b.matchNumber));
  }

  async getMatchData() {
    if (this.eventTeam.year == "2020") {
      this.matches2020 = await this.dbContext.teamMatches2020
        .where(["eventCode", "teamNumber"])
        .equals([this.eventTeam.eventCode, this.eventTeam.teamNumber]).toArray();
      this.matches2020.sort((a, b) => naturalSort(a.matchNumber, b.matchNumber));
    }
  }
}
