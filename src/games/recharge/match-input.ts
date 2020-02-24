import { autoinject } from "aurelia-framework";
import { BootstrapRenderer } from "../../utilities/bootstrap-renderer";
import * as naturalSort from "javascript-natural-sort";
import { ValidationController, ValidationControllerFactory } from "aurelia-validation";
import { TeamMatch2020Entity, TeamEntity, EventEntity, EventMatchEntity, FrcStatsContext, make2020match, EventMatchSlots, qualitativeAnswers} from "../../persistence";
import { Disposable, BindingEngine, DirtyCheckProperty } from "aurelia-binding";
import { DialogService } from "aurelia-dialog";
import { Router } from "aurelia-router";
import { scrollToTop } from "../../utilities/scroll";
import { getTeamNumbers } from "../merge-utils";
import { DeepSpaceBingoDialog } from "./deepspace-bingo";
import { QrCodeDisplayDialog } from "../../qrcodes/display-dialog";
import { cloneDeep } from "lodash";
import { nextMatchNumber, previousMatchNumber } from "../../model";
import { setupValidationRules } from "./model";
import { SaveDialog } from "../../utilities/save-dialog";
import { equals } from "../../utilities/dirty-change-checker";
import { SettingsDialog } from "./settings-dialog";
import { TimeRemaining } from "../../utilities/time-remaining";

@autoinject
export class MatchInputPage {
  public model: TeamMatch2020Entity;
  public pristineModel: TeamMatch2020Entity;
  public team: TeamEntity;
  public event: EventEntity;
  public eventMatch: EventMatchEntity;
  public partner1: string;
  public partner2: string;
  public liftedPartner1 = false;
  public liftedPartner2 = false;
  public isBlue = false;
  public isRed = false;
  public errorMessage: string;
  public errorNotScheduled = false;
  public hasNextMatch = false;
  public hasPreviousMatch = false;
  public qualifiedAnswers = qualitativeAnswers;
  public maxWhen = 135;
  public hasSaved: boolean;
  public slots: any;
  public failureReasonTemp: string;
  public foulReasonTemp: string;
  public liftedTemp: string[];
  public liftedBy: string;
  public didLiftLevel3: boolean;
  public secondsStartTemp: number;
  public secondsEndTemp: number;
  public level3SucceedTemp: boolean;
  public secret: boolean;
  public matchNumbers: string[];
  public timeRemaining: number = 15;
  public timeRemainingSandstorm: boolean = true;
  public timeRemainingModel: TimeRemaining;
  timerIntervalId: NodeJS.Timer;

  public rules: any[];
  public validationController: ValidationController;
  private renderer: BootstrapRenderer;
  private observers: Disposable[];
  public mehWereNotPicking = false;

  constructor(
    private bindingEngine: BindingEngine,
    private dialogService: DialogService,
    private dbContext: FrcStatsContext,
    validationControllerFactory: ValidationControllerFactory,
    private router: Router
  ) {
    this.validationController = validationControllerFactory.createForCurrentScope();
    this.hasSaved = false;
    this.secret = false;
    this.slots = null;
    this.liftedTemp = [];
  }

  public async activate(params) {
    scrollToTop();
    this.observeFields();

    await this.loadPrefs();
    await this.load(params);
    this.setupValidation();
  }

  public async loadPrefs() {
    let userPrefs = await this.dbContext.getUserPrefs();
    this.mehWereNotPicking = userPrefs.mehWereNotPicking;
  }

  public deactivate() {
    this.unobserveFields();
    this.teardownValidation();
  }

  private observeFields() {
    this.observers = [];

    this.observers.push(this.bindingEngine.propertyObserver(this, 'liftedPartner1').subscribe(liftedPartner1 => {
      if (liftedPartner1 && this.model.lifted.indexOf(this.partner1) == -1) {
        this.model.lifted.push(this.partner1);
      } else if (!liftedPartner1 && this.model.lifted.indexOf(this.partner1) != -1) {
        this.model.lifted = this.model.lifted.filter(teamNumber => teamNumber != this.partner1);
      }
    }));

    this.observers.push(this.bindingEngine.propertyObserver(this, 'liftedPartner2').subscribe(liftedPartner2 => {
      if (liftedPartner2 && this.model.lifted.indexOf(this.partner2) == -1) {
        this.model.lifted.push(this.partner2);
      } else if (!liftedPartner2 && this.model.lifted.indexOf(this.partner2) != -1) {
        this.model.lifted = this.model.lifted.filter(teamNumber => teamNumber != this.partner2);
      }
    }));

  }

  private observeModel() {
    this.observers.push(this.bindingEngine.propertyObserver(this.model, 'level3ClimbAttempted').subscribe(() => {
      if (!this.model.climbAttempted) {
        this.model.climbSucceeded = false;
      }
    }));
  }

  public syncLiftedAndEntries() {

    this.liftedTemp = this.model.lifted;
    this.model.lifted = [];
    this.liftedPartner1 = false;
    this.liftedPartner2 = false;

    return true;
  }

  private unobserveFields() {
    for (var observer of this.observers) {
      observer.dispose();
    }
    this.observers = [];
  }

  public async load(params) {
    let matches = await this.dbContext.getTeamMatches2020({
      eventCode: params.eventCode,
      teamNumber: params.teamNumber,
      matchNumber: params.matchNumber,
    });
    if (matches.length == 0) {
      this.model = make2020match(params.eventCode, params.teamNumber, params.matchNumber);
    } else {
      this.model = matches[0];
    }

    this.pristineModel = cloneDeep(this.model);

    

    this.observeModel();

    this.team = await this.dbContext.getTeam(params.teamNumber)
    this.event = await this.dbContext.getEvent(params.year, params.eventCode);
    this.eventMatch = await this.dbContext.getEventMatch(params.year, params.eventCode, params.matchNumber);
    this.slots = EventMatchSlots.filter(slot =>
      this.eventMatch[slot.prop] == this.model.teamNumber
    )[0];
    let nextMatch = await this.dbContext.getEventMatch(params.year, params.eventCode, nextMatchNumber(params.matchNumber));
    let prevMatch = await this.dbContext.getEventMatch(params.year, params.eventCode, previousMatchNumber(params.matchNumber));
    this.hasNextMatch = nextMatch != null;
    this.hasPreviousMatch = prevMatch != null;
    let teamNumbers = getTeamNumbers(this.eventMatch);
    if (!teamNumbers.has(params.teamNumber)) {
      this.errorNotScheduled = true;
    }

    var blues = [this.eventMatch.blue1, this.eventMatch.blue2, this.eventMatch.blue3];
    var reds = [this.eventMatch.red1, this.eventMatch.red2, this.eventMatch.red3];
    this.isBlue = blues.indexOf(this.team.teamNumber) != -1;
    this.isRed = reds.indexOf(this.team.teamNumber) != -1;
    if (this.isBlue) {
      var others = blues.filter(teamNumber => teamNumber != this.team.teamNumber);
      this.partner1 = others[0];
      this.partner2 = others[1];
    } else if (this.isRed) {
      var others = reds.filter(teamNumber => teamNumber != this.team.teamNumber);
      this.partner1 = others[0];
      this.partner2 = others[1];
    }
    if (this.model.lifted == null || !Array.isArray(this.model.lifted)){
      this.liftedPartner2 = false;
      this.liftedPartner1 = false;
    } 
    else{
    this.liftedPartner2 = this.model.lifted.findIndex((teamNumber) => teamNumber == this.partner2) != -1;
    this.liftedPartner1 = this.model.lifted.findIndex((teamNumber) => teamNumber == this.partner1) != -1;
    }
    

    if (this.model.lifted == null) {
      this.model.lifted = [];
    }

    if (this.model.lifted.indexOf(this.partner1) != -1) {
      this.liftedPartner1 = true;
    }
    if (this.model.lifted.indexOf(this.partner2) != -1) {
      this.liftedPartner2 = true;
    }

    let eventMatches = await this.dbContext.getEventMatches(this.event.year, this.event.eventCode);
    this.matchNumbers = eventMatches.map(x => x.matchNumber);
    this.matchNumbers.sort(naturalSort);
  }

  public setupValidation() {
    let allRules = setupValidationRules();
    this.rules = allRules.rules;
    this.renderer = new BootstrapRenderer({ showMessages: true });
    this.validationController.addRenderer(this.renderer);
  }

  private teardownValidation() {
    this.validationController.removeRenderer(this.renderer);
  }

  public showBingo() {
    DeepSpaceBingoDialog.open(this.dialogService, {
      event: this.event,
      dialogService: this.dialogService,
      matches: this.matchNumbers,
      matchNumber: this.eventMatch.matchNumber,
      teamNumber: this.model.teamNumber,
      teams: [],
    });
  }

  public exportToQrCode() {
    if (this.model.id == null) {
      return;
    }
    QrCodeDisplayDialog.open(this.dialogService,
      { data: this.prepareQrCodeData() },
    )
  }

  public prepareQrCodeData() {
    let model = cloneDeep(this.model);
    delete model['id'];
    model['year'] = this.event.year;
    let result = JSON.stringify(model);
    return result;
  }


  public foundIt() {
    this.secret = !this.secret;
  }

  public clickedIt() {
    console.log("this.pristineModel: ", this.pristineModel);
    console.log("this.model: ", this.model);
  }


  public async validateAll() {
    let results = await (this.validationController.validate({
      object: this.model,
      rules: this.rules,
    }));
    console.info(results);
    return results;

  }

  public async canDeactivate(): Promise<boolean> {
    console.log("canDeactivate() called");
    if (this.hasChanges()) {
      let something = await SaveDialog.open(this.dialogService, {}).whenClosed((nil) => {
        return nil;
      });
      return !something.wasCancelled;
    }
    else {
      return true;
    }
  }

  public syncBoolAndReason() {

    if (this.model.isFailure) {
      this.model.failureReason = this.failureReasonTemp;
    }
    else {
      this.failureReasonTemp = this.model.failureReason;
      this.model.failureReason = "";
    }

    return true;
  }

  public syncClimbEntries() {
    if(!this.model.climbAttempted) {
      this.secondsStartTemp = this.model.climbBegin;
      this.secondsEndTemp = this.model.climbEnd;
      this.level3SucceedTemp = cloneDeep(this.model.climbSucceeded);
      this.model.climbSucceeded = false;
      this.model.climbBegin = null;
      this.model.climbEnd = null;
      //console.log("this.model.level3ClimbBegin is now", this.model.level3ClimbBegin);
      //console.log("this.model.level3ClimbEnd is now", this.model.level3ClimbEnd);
    } else {
      this.model.climbBegin = this.secondsStartTemp;
      this.model.climbEnd = this.secondsEndTemp;
      this.model.climbSucceeded = this.level3SucceedTemp;
      //console.log("this.model.level3ClimbBegin is now", this.model.level3ClimbBegin);
      //console.log("this.model.level3ClimbEnd is now", this.model.level3ClimbEnd);
    }
  }

  public syncBoolAndReason2() {

    if (this.model.isFoul) {
      this.model.foulReason = this.foulReasonTemp;
    }
    else {
      this.foulReasonTemp = this.model.foulReason;
      this.model.foulReason = "";
    }

    return true;
  }
  public hasChanges() {
    let properties = [
      'cargoPickup', 'drivetrainStrength', 'defenseWeaknesses', 'liftedSomeone', 'wasLifted', 'hatchPanelPickup', 'level2ClimbAttempted', 'level2ClimbSucceeded', 'level3ClimbAttempted', 'level3ClimbSucceeded',
      'level3ClimbBegin', 'level3ClimbEnd', 'liftedBy', 'isFailure', 'failureReason', 'isFoul', 'foulReason', 'notes'
    ];
    for (var j = 0; j < properties.length; j++) {
      if (!equals(properties[j], this.model, this.pristineModel)) {
        return true;
      }
    }

    if(Array.isArray(this.model.lifted)) {
    if (this.model.lifted.length != this.pristineModel.lifted.length) {
      return true;
    }

    for (var i = 0; i < this.model.lifted.length; i++) {
      if (this.pristineModel.lifted.findIndex(teamNumber => teamNumber == this.model.lifted[i]) == -1) {
        return true;
      }
    }
  }
    return false;
  }

  public async save() {
    
    let validationResult = await this.validateAll();
    
    if(validationResult.valid) {
      let savedMatches = await this.dbContext.getTeamMatches2020({
        eventCode: this.model.eventCode,
        teamNumber: this.model.teamNumber,
        matchNumber: this.model.matchNumber,
      });
      let modelToSave = JSON.parse(JSON.stringify(this.model))
      this.fixupNumericProperties(modelToSave);
      if (savedMatches.length != 0) {
        modelToSave.id = savedMatches[0].id;
      }
      await this.dbContext.teamMatches2020.put(modelToSave);
      await this.load({
        year: this.event.year,
        eventCode: this.model.eventCode,
        matchNumber: this.model.matchNumber,
        teamNumber: this.model.teamNumber
      });
      // yay, you saved! we're not taking you anywhere
      this.hasSaved = true;
      setTimeout(() => {
        this.hasSaved = false;
      }, 3000);
    } else {
      this.errorMessage = "There are validation errors!";
      setTimeout(() => {
        this.errorMessage = null;
      }, 3000);
        this.hasSaved = false;
    }
  }

  private fixupNumericProperties(model: any) {
    let numericProperties = [
      'cargoPickup', 'hatchPanelPickup',
      'level3ClimbBegin', 'level3ClimbEnd',
    ];
    let numericPlacementProperties = [
      "when"
    ];

    function fixupProperty(obj, prop: string) {
      if ((obj[prop] == null || obj[prop] == "") && obj[prop] !== 0) {
        obj[prop] = null;
      } else if (obj[prop] == "Infinity") {
        obj[prop] = Infinity;
      } else if (typeof obj[prop] == "string") {
        obj[prop] = parseInt(obj[prop]);
      }
    }

    for (var prop of numericProperties) {
      fixupProperty(model, prop);
    }
  }
  public async gotoMatch(matchNumber: string) {
    let eventCode = this.model.eventCode;
    let year = this.event.year;
    let slot = EventMatchSlots.filter(slot =>
      this.eventMatch[slot.prop] == this.model.teamNumber
    )[0];
    let nextEventMatch = await this.dbContext.getEventMatch(this.event.year, this.event.eventCode, matchNumber);
    let teamNumber = nextEventMatch[slot.prop];

    this.router.navigateToRoute("match-team", {
      year: year,
      eventCode: eventCode,
      teamNumber: teamNumber,
      matchNumber: matchNumber,
    });
  }

  public async gotoNextMatch() {
    await this.gotoMatch(nextMatchNumber(this.model.matchNumber));
  }

  public async gotoPreviousMatch() {
    await this.gotoMatch(previousMatchNumber(this.model.matchNumber));
  }

  public async showSettings() {
    let dialogResults = await SettingsDialog.open(this.dialogService, {}).whenClosed(() => {});
    await this.loadPrefs();
  }

  public startTimer() {
    this.timeRemaining = 15;
    this.timeRemainingSandstorm = true;
    this.timerIntervalId = setInterval(() => {
      this.timeRemainingModel.decrement();
      if (this.timeRemaining == 1 && !this.timeRemainingSandstorm) {
        this.resetTimer();
      }
    }, 1000);
  }

  public resetTimer() {
    this.timeRemaining = 15;
    this.timeRemainingSandstorm = true;
    clearInterval(this.timerIntervalId);
    this.timerIntervalId = null;
  }
}
