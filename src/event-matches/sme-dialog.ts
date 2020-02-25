import { autoinject } from "aurelia-framework";
import { DialogController, DialogService } from "aurelia-dialog";
import { FrcStatsContext, EventEntity, EventTeamEntity } from "../persistence";
import * as naturalSort from "javascript-natural-sort";

@autoinject
export class SMEDialog {

  allSMEs = ["1", "2", "3", "4", "5", "6"];
  smeCounts: Map<string, number>;
  event: EventEntity;
  eventTeams: EventTeamEntity[];

  constructor(
    private dbContext: FrcStatsContext,
    private controller: DialogController) {
      this.smeCounts = new Map();
  }

  async activate(model: SMEDialogModel) {
    this.controller.settings.lock = false;
    this.event = await this.dbContext.getEvent(model.year, model.eventCode);
    this.eventTeams = await this.dbContext.getEventTeams(model.year, model.eventCode);
    this.eventTeams.sort((a, b) => naturalSort(a.teamNumber, b.teamNumber));

    let i = 0;
    for(var eventTeam of this.eventTeams) {
      (<any>eventTeam).sme = this.allSMEs[i];
      i = (i + 1) % this.allSMEs.length;
    }
    this.smeChanged();
  }

  smeChanged() {
    this.smeCounts = new Map();
    for (var sme of this.allSMEs) {
      this.smeCounts.set(sme, 0);
    }
    for(var eventTeam of this.eventTeams) {
      let value = this.smeCounts.get((<any>eventTeam).sme)
      this.smeCounts.set((<any>eventTeam).sme, value+1);
    }
  }

  async save() {
    this.event.smes = new Map();
    for (var sme of this.allSMEs) {
      this.event.smes.set(sme, []);
    }
    for (var eventTeam of this.eventTeams) {
      this.event.smes.get((<any>eventTeam).sme).push(eventTeam.teamNumber);
    }

    await this.dbContext.events.put(this.event);
    await this.controller.ok()

  }

  public static open(dialogService: DialogService, model: SMEDialogModel) {
    return dialogService.open({ model: model, viewModel: SMEDialog });
  }
}

export interface SMEDialogModel {
  year: string;
  eventCode: string;

}
