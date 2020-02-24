import { IEventJson, IMergeState } from "..";
import { TeamMatch2020Entity, matches2020AreEqual, make2020match} from "../../persistence";
import { ValidationRules } from "aurelia-validation";
import { RechargeTeamStatistics } from "./statistics";

export interface DeepSpaceEventJson extends IEventJson {
  matches2020: TeamMatch2020Entity[];
}

export interface MergeDialogModel {
  state: Match2020MergeState;
}

export class Match2020MergeState implements IMergeState {
  public localSaved: TeamMatch2020Entity;
  public fromFile: TeamMatch2020Entity;
  public merged: TeamMatch2020Entity;
  public same: boolean;
  public resolved: boolean;
  public takeFromFile: boolean;
  public takeLocal: boolean;

  constructor(public matchNumber: string, public teamNumber: string) {
  }

  public setSameness() {
    this.same = matches2020AreEqual(this.localSaved, this.fromFile);
    this.resolved = this.same;
    if (this.localSaved != null && this.fromFile == null) {
      this.takeLocal = true;
      this.takeFromFile = false;
      this.resolved = true;
    } else if (this.localSaved == null && this.fromFile != null) {
      this.takeLocal = false;
      this.takeFromFile = true;
      this.resolved = true;
    }
  }

  public static makeFromDb(entity: TeamMatch2020Entity): Match2020MergeState {
    let state = new Match2020MergeState(entity.matchNumber, entity.teamNumber);
    state.localSaved = entity;
    state.merged = make2020match(entity.eventCode, entity.teamNumber, entity.matchNumber);
    return state;
  }

  public static makeFromFile(entity: TeamMatch2020Entity): Match2020MergeState {
    let state = new Match2020MergeState(entity.matchNumber, entity.teamNumber);
    state.fromFile = entity;
    state.merged = make2020match(entity.eventCode, entity.teamNumber, entity.matchNumber);
    return state;
  }
}

export function setupValidationRules() {
  /* istanbul ignore next */
  let rules = ValidationRules
    .ensure((obj: TeamMatch2020Entity) => obj.autoHighGoal)
    .satisfiesRule("minimum", 0)
    .satisfiesRule("maximum", 135)
    .satisfiesRule("isNumeric")
    .ensure((obj: TeamMatch2020Entity) => obj.autoHighInnerGoal)
    .satisfiesRule("minimum", 0)
    .satisfiesRule("maximum", 135)
    .satisfiesRule("isNumeric")
    .ensure((obj: TeamMatch2020Entity) => obj.autoLowGoal)
    .satisfiesRule("minimum", 0)
    .satisfiesRule("maximum", 135)
    .satisfiesRule("isNumeric")
    .ensure((obj: TeamMatch2020Entity) => obj.teleopHighGoal)
    .satisfiesRule("minimum", 0)
    .satisfiesRule("maximum", 135)
    .satisfiesRule("isNumeric")
    .ensure((obj: TeamMatch2020Entity) => obj.teleopHighInnerGoal)
    .satisfiesRule("minimum", 0)
    .satisfiesRule("maximum", 135)
    .satisfiesRule("isNumeric")
    .ensure((obj: TeamMatch2020Entity) => obj.teleopLowGoal)
    .satisfiesRule("minimum", 0)
    .satisfiesRule("maximum", 135)
    .satisfiesRule("isNumeric")
    .ensure((obj: TeamMatch2020Entity) => obj.controlPanelRotationBegin)
    .satisfiesRule("minimum", 0)
    .satisfiesRule("maximum", 135)
    .satisfiesRule("isNumeric")
    .ensure((obj: TeamMatch2020Entity) => obj.controlPanelRotationEnd)
    .satisfiesRule("minimum", 0)
    .satisfiesRule("maximum", 135)
    .satisfiesRule("isNumeric")
    .satisfiesRule("isParadox", "controlPanelRotationBegin")
    .when((obj:TeamMatch2020Entity) => obj.controlPanelRotationAttempted)
    .ensure((obj: TeamMatch2020Entity) => obj.controlPanelPositionBegin)
    .satisfiesRule("minimum", 0)
    .satisfiesRule("maximum", 135)
    .satisfiesRule("isNumeric")
    .ensure((obj: TeamMatch2020Entity) => obj.controlPanelPositionEnd)
    .satisfiesRule("minimum", 0)
    .satisfiesRule("maximum", 135)
    .satisfiesRule("isNumeric")
    .satisfiesRule("isParadox", "controlPanelPositionBegin")
    .when((obj:TeamMatch2020Entity) => obj.controlPanelPositionAttempted)
    .ensure((obj: TeamMatch2020Entity) => obj.climbBegin)
    .satisfiesRule("minimum", 0)
    .satisfiesRule("maximum", 135)
    .satisfiesRule("isNumeric")
    .ensure((obj: TeamMatch2020Entity) => obj.climbEnd)
    .satisfiesRule("minimum", 0)
    .satisfiesRule("maximum", 135)
    .satisfiesRule("isNumeric")
    .satisfiesRule("isParadox", "climbBegin")
    .when((obj:TeamMatch2020Entity) => obj.climbAttempted)
    .ensure((obj: TeamMatch2020Entity) => obj.climbSucceeded)
    .satisfiesRule("attempted", "climbAttempted")
    .ensure ((obj: TeamMatch2020Entity) => obj.lifted)
    .satisfies((lifted: string[], obj:TeamMatch2020Entity) => {
      if(obj.liftedSomeone == false){
        return true
      }
      else {
        if (lifted.length == 0){
          return false
        }
        else{
          return true
        }
      }
    })
    .withMessage("select the team lifted")
    .rules;

  return { rules};
}

var print = false;
export function doPrint(val: boolean) {
  print = val;
}

export interface MatchAndStats {
  match: TeamMatch2020Entity;
  stats: RechargeTeamStatistics;
}
