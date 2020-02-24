import { autoinject } from "aurelia-framework";
import { DialogController, DialogService } from "aurelia-dialog";
import { ValidationController, ValidationControllerFactory, ValidationRules } from "aurelia-validation";
import { BootstrapRenderer } from "../../utilities/bootstrap-renderer";
import { Match2020MergeState, MergeDialogModel, setupValidationRules } from "./model";
import { allDeepSpaceGamepieceTypes, allDeepSpaceLocations, DeepSpaceEventType } from "../../persistence";

@autoinject
export class Match2020MergeDialog {
  state: Match2020MergeState;
  private validationController: ValidationController;
  private renderer: BootstrapRenderer;
  public rules: any[];
  public errorMessage: string;

  public static properties = [
    "startingPosition",
    "autoCrossedLine",
    "autoHighGoal",
    "autoHighInnerGoal",
    "autoLowGoal",

    /**TELEOPERATED */
    "teleopHighGoal",
    "teleopHighInnerGoal",
    "teleopLowGoal",
    //"deadOnField",
    //"spinnyBois",
    "powerCellPickup",
    "controlPanelRotationAttempted",
    "controlPanelRotationSucceeded",
    "controlPanelRotationBegin",
    "controlPanelRotationEnd",
    "controlPanelPositionAttempted",
    "controlPanelPositionSucceeded",
    "controlPanelPositionBegin",
    "controlPanelPositionEnd",

    /**END GAME */
    "climbAttempted",
    "climbSucceeded",
    "climbBegin",
    "climbEnd",
    "lifted",
    "liftedSomeone",
    "isFailure",
    "failureReason",
    "isFoul",
    "foulReason",
    "notes",
    "defenseCapability",
    "defenseWeaknesses",
  ];

  constructor (
    validationControllerFactory: ValidationControllerFactory,
    private controller: DialogController
  ) {
    this.validationController = validationControllerFactory.createForCurrentScope();
  }

  activate(model: MergeDialogModel) {
    this.state = model.state;
    this.controller.settings.lock = false;
    this.controller.settings.overlayDismiss = true;

    for (var prop of Match2020MergeDialog.properties) {
      if(this.state.localSaved[prop] == this.state.fromFile[prop]) {
        this.state.merged[prop] = this.state.localSaved[prop];
      }
    }

    this.setupValidation();
  }

  deactivate() {
    this.teardownValidation();
  }

  private setupValidation() {
    let allRules = setupValidationRules();
    this.rules = allRules.rules;

    this.renderer = new BootstrapRenderer({showMessages: true});
    this.validationController.addRenderer(this.renderer);
  }

  private teardownValidation() {
    this.validationController.removeRenderer(this.renderer);
  }

  liftedEqual() {
    if(this.state.localSaved.lifted == null && this.state.fromFile.lifted == null) {
      return true;
    }
    if(this.state.localSaved.lifted.length != this.state.fromFile.lifted.length) {
      return false;
    }

    for(var i = 0; i < this.state.localSaved.lifted.length; i++) {
      if(this.state.localSaved.lifted[i] != this.state.fromFile.lifted[i]) {
        return false;
      }
    }
    return true;
  }

  public takeAllFromDb() {
    for (var prop of Match2020MergeDialog.properties) {
      this.state.merged[prop] = this.state.localSaved[prop];
    }
  }

  public takeAllFromFile() {
    for (var prop of Match2020MergeDialog.properties) {
      this.state.merged[prop] = this.state.fromFile[prop];
    }
  }

  public async validateAll() {
    let results = await this.validationController.validate({
      object: this.state.merged,
      rules: this.rules,
    });

    return results;
  }

  public async resolve() {
    let result = await this.validateAll();
      if(result.valid) {
        this.state.resolved = true;
        this.controller.ok();
      }
      else{
        this.errorMessage = "You screwed up.";
        this.state.resolved = false;
      }
  }


  public static open(dialogService: DialogService, model: MergeDialogModel) {
    return dialogService.open({model: model, viewModel: Match2020MergeDialog});
  }
}
