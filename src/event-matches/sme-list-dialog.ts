import { autoinject } from "aurelia-framework";
import { FrcStatsContext, EventEntity } from "../persistence";
import { DialogController } from "aurelia-dialog";
import { DialogService } from "aurelia-dialog";

@autoinject
export class SMEListDialog {
  model: SMEListDialogModel;
  event: EventEntity;
  teams: string[];

  constructor(
    private dbContext: FrcStatsContext,
    private controller: DialogController,
    private dialogService: DialogService
  ){
  }

  async activate(model: SMEListDialogModel) {
    this.controller.settings.lock = false;
    this.controller.settings.overlayDismiss = true;
    this.model = model;
    this.event = await this.loadEvent();
  }


  deactivate() {
  }

  async loadEvent() {
    let event = await this.dbContext.getEvent(this.model.year, this.model.eventCode);
    if(event.smes != null) {
      this.teams = event.smes.get(event.selectedSME);
    }else{
      this.teams = [];
    }
    return event;
  }

  public static open(dialogService: DialogService, model: SMEListDialogModel) {
    return dialogService.open({model: model, viewModel: SMEListDialog});
  }
}

export interface SMEListDialogModel{
  year: string;
  eventCode: string;
}


