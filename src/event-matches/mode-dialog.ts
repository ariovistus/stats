import { autoinject } from "aurelia-framework";
import { ValidationController, ValidationControllerFactory, ValidationRules } from "aurelia-validation";
import { FrcStatsContext, EventTeamEntity, EventMatchEntity, EventMatchSlots, EventEntity, TeamEntity } from "../persistence";
import { DialogController } from "aurelia-dialog";
import { DialogService } from "aurelia-dialog";
import { ConfirmDialog } from "./confirm-dialog";
import { BootstrapRenderer } from "../utilities/bootstrap-renderer";
import { gameManager } from "../games/index"
import { getTeamNumbers } from "../games/merge-utils";
import { SMEDialog } from "./sme-dialog";

@autoinject
export class ModeDialog {

  SWIMLANES = "swimlanes";
  SMES = "smes";

  model: ModeDialogModel;
  scountingMode: string;
  event: EventEntity;
  allSMEs: string[];

  constructor(
    private dbContext: FrcStatsContext,
    private controller: DialogController,
    private dialogService: DialogService
  ){
    this.allSMEs = [];
  }

  async activate(model: ModeDialogModel) {
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
      this.allSMEs = Array.from(event.smes.keys());
    }else {
      this.allSMEs = [];
    }
    return event;
  }

  editSMEs() {
    SMEDialog.open(this.dialogService, this.model).whenClosed(async () => {
      let event = await this.loadEvent();
      event.scoutingMode = this.event.scoutingMode;
      event.scheduleEditable = this.event.scheduleEditable;
      this.event = event;
    });
  }

  async save() {
    await this.dbContext.events.put(this.event);
    await this.controller.ok();
  }

  public static open(dialogService: DialogService, model: ModeDialogModel) {
    return dialogService.open({model: model, viewModel: ModeDialog});
  }
}

export interface ModeDialogModel{
  year: string;
  eventCode: string;
}

