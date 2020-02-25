import { autoinject } from "aurelia-framework";
import { DialogController, DialogService } from "aurelia-dialog";
import { BindingEngine, Disposable } from "aurelia-binding";
import * as naturalSort from "javascript-natural-sort";
import { debounce, cloneDeep } from "lodash";
import { PickerResultDoc } from "gapi_module";
import { FrcStatsContext, EventMatchEntity, TeamMatch2018Entity, EventEntity, EventTeamEntity, TeamMatch2019Entity } from "../persistence";
import { GoogleDriveApi, FileExistsOutput } from "../google-apis";
import { gameManager } from "../games/index";
import * as XLSX from 'xlsx';
import { makeTeamStats, DeepSpaceTeamStatistics } from "../games/deepspace/statistics";

// todo: set up validator, prevent double quotes in file names
@autoinject
export class ExportDialog {
  event: EventEntity;
  observers: Disposable[];
  done = false;
  doneMessage: string;
  textarea: HTMLTextAreaElement;
  fileName: string;
  driveFolder: PickerResultDoc;
  showUploadToDrive = false;
  waitingAllowUploadToDrive = false;
  waitingOnUpload = false;
  driveFileExists: FileExistsOutput;
  hasErrors = false;
  errorMessage: string;
  active: number;

  constructor(
    private controller: DialogController,
    private dialogService: DialogService,
    private gdriveApi: GoogleDriveApi,
    private dbContext: FrcStatsContext,
    private bindingEngine: BindingEngine,
    ) {
  }

  activate(model) {
    this.event = model.event;

    this.controller.settings.lock = false;
    this.controller.settings.overlayDismiss = true;
    this.setupObservers();
    this.fileName = `${this.event.year}-${this.event.eventCode}`;
    this.active = 0;
  }

  deactivate() {
    this.teardownObservers();
  }

  private setupObservers() {
    this.observers = [];

    let fileNameObserver = this.bindingEngine.propertyObserver(this, "fileName").subscribe(debounce(() => {
      if(this.showUploadToDrive) {
        this.driveCheckUploadFolder();
      }
    }, 800));

    this.observers.push(fileNameObserver);
  }

  private teardownObservers() {
    for(var observer of this.observers) {
      observer.dispose();
    }
    this.observers = [];
  }

  selectGoogleDrive() {
    this.gdriveApi.openFolderSelector("Select folder in which to save file").then(result => {
      if(result.action == "picked") {
        this.driveFolder = result.docs[0]
        this.showUploadToDrive = true;
        this.driveCheckUploadFolder();
      }
    });
  }

  driveCheckUploadFolder() {
    this.waitingAllowUploadToDrive = true;
    let dto = {folderId: this.driveFolder.id, fileName: this.fileName, description: null, content: null};
    this.gdriveApi.fileExists(dto).then(result => {
      this.driveFileExists = result;
      this.waitingAllowUploadToDrive = false;
    });
  }

  exportGoogleDrive() {
    if(this.driveFileExists == null) {
      return;
    }
    if(this.driveFileExists.manyExist) {
      return;
    }

    let game = gameManager.getGame(this.event.year);

    game.exportEventJson(this.event).then(json => {
      let fileId = this.driveFileExists.exists? this.driveFileExists.fileId : null
      this.hasErrors = false;
      this.waitingOnUpload = true;
      this.gdriveApi.uploadFile({
        fileName: this.fileName + ".json",
        description: `${this.event.year} data for ${this.event.name}`,
        content: JSON.stringify(json),
        folderId: this.driveFolder.id,
        fileId: fileId,
      }).then(results => {
        this.waitingOnUpload = false;
        if(results.status != 200) {
          this.hasErrors = true;
          results.json().then(json => {
            this.errorMessage = json.error.message;
          });
        }else{
          this.doneMessage = "Success!";
          this.done = true;
        }
      }, () => {
        this.waitingOnUpload = false;
        this.hasErrors = true;
      });
    }, () => {
      this.hasErrors = true;
    });
  }

  exportGoogleDriveXLSX() {
    //Needs to be done
    if(this.driveFileExists == null) {
      return;
    }
    if(this.driveFileExists.manyExist) {
      return;
    }

    let game = gameManager.getGame(this.event.year);

    game.exportEventJson(this.event).then(json => {
      let fileId = this.driveFileExists.exists? this.driveFileExists.fileId : null
      this.hasErrors = false;
      this.waitingOnUpload = true;
      this.gdriveApi.uploadFile({
        fileName: this.fileName + ".xlsx",
        description: `${this.event.year} data for ${this.event.name}`,
        content: JSON.stringify(json),
        folderId: this.driveFolder.id,
        fileId: fileId,
      }).then(results => {
        this.waitingOnUpload = false;
        if(results.status != 200) {
          this.hasErrors = true;
          results.json().then(json => {
            this.errorMessage = json.error.message;
          });
        }else{
          this.doneMessage = "Success!";
          this.done = true;
        }
      }, () => {
        this.waitingOnUpload = false;
        this.hasErrors = true;
      });
    }, () => {
      this.hasErrors = true;
    });
  }

  async exportRawXLSX() {
    let game = gameManager.getGame(this.event.year);

    let xlsx = await game.exportEventXLSX(this.event);

    await this.downloadXLSX(this.event, xlsx);
  }

  exportRawFile() {
    let game = gameManager.getGame(this.event.year);

    game.exportEventJson(this.event).then(json => {
      json = cloneDeep(json);
      if(json.event.smes) {
        json.event.smes = <any>mapToJsonable(json.event.smes);
      }
      this.downloadJson(this.event, json);
    });
    
  }

  private async downloadXLSX(event: EventEntity, xlsx) {
    let name = "";
    name += this.fileName;
    let teamStats = <DeepSpaceTeamStatistics[]>[];
    let dataTemp = [];
    let data = [["TEAM #", "TEAM NAME", "SCOUTED MATCH COUNT", "CARGO PICKUP", "HATCH PICKUP", "AVG GAMEPIECE COUNT", "AVG CARGO COUNT", "AVG HATCH COUNT", "AVG CARGO SANDSTORM", "AVG HATCH SANDSTORM", "AVG CARGO CYCLE TIME", "AVG CARGO CYCLE TIME CARGO SHIP", "AVG CARGO CYCLE TIME ROCKET LOW", "AVG CARGO CYCLE TIME ROCKET MID", "AVG CARGO CYCLE TIME ROCKET HIGH", "AVG HATCH CYCLE TIME", "AVG HATCH CYCLE TIME CARGO SHIP", "AVG HATCH CYCLE TIME ROCKET LOW", "AVG HATCH CYCLE TIME ROCKET MID", "AVG HATCH CYCLE TIME ROCKET HIGH", "LEVEL 2 CLIMBS", "LEVEL 3 CLIMBS", "LEVEL 3 TIME", "LEVEL 2 LIFTS", "LEVEL 3 LIFTS", "% OF MATCHES w/ CARGO PLACED", "% OF MATCHES w/ HATCHES PLACED", "DEFENSE RATING", "FOUL COUNT", "FAILURE COUNT"]];

    console.log("getting eventData...");
    let eventData = await this.dbContext.getEventTeams(event.year, event.eventCode);
    for(let i = 0; i < eventData.length; i++) {
      console.log("getting teamMatch2019Temp for team", eventData[i].teamNumber);
      let teamMatch2019Temp = await this.dbContext.getTeamMatches2019({
        teamNumber: eventData[i].teamNumber,
        eventCode: eventData[i].eventCode
      });
      console.log("getting teamData for team", eventData[i].teamNumber);
      let teamData = await this.dbContext.getTeam(eventData[i].teamNumber);
      let stats = makeTeamStats(teamData, teamMatch2019Temp);
      teamStats.push(stats);
    }

    for(let k = 0; k < teamStats.length; k++) {
      let cargoPickupScore = "";
      cargoPickupScore += teamStats[k].cargoPickup.name, "(", teamStats[k].cargoPickupRaw, " / 40)";
      let hatchPickupScore = "";
      hatchPickupScore += teamStats[k].hatchPanelPickup.name, "(", teamStats[k].hatchPanelPickupRaw, " / 40)";
      let defenseScore = "";
      defenseScore += teamStats[k].drivetrainStrength.name;
      let cargoPercent = teamStats[k].cargoPlacedMatchCount / teamStats[k].matchCount;
      let hatchPercent = teamStats[k].hatchPanelPlacedMatchCount / teamStats[k].matchCount;

      let cargo = 0;
      cargo = this.isEmpty(teamStats[k].avgCargoCycleTime, cargo, 160);
      let cargoCargoShip = 0;
      cargoCargoShip = this.isEmpty(teamStats[k].avgCargoCycleTimeCargoShip, cargoCargoShip, 160);
      let cargoRocketLow = 0;
      cargoRocketLow = this.isEmpty(teamStats[k].avgCargoCycleTimeRocketLow, cargoRocketLow, 160);
      let cargoRocketMid = 0;
      cargoRocketMid = this.isEmpty(teamStats[k].avgCargoCycleTimeRocketMid, cargoRocketMid, 160);
      let cargoRocketHigh = 0;
      cargoRocketHigh = this.isEmpty(teamStats[k].avgCargoCycleTimeRocketHigh, cargoRocketHigh, 160);
      let hatch = 0;
      hatch = this.isEmpty(teamStats[k].avgHatchPanelCycleTime, hatch, 160);
      let hatchCargoShip = 0;
      hatchCargoShip = this.isEmpty(teamStats[k].avgHatchPanelCycleTimeCargoShip, hatchCargoShip, 160);
      let hatchRocketLow = 0;
      hatchRocketLow = this.isEmpty(teamStats[k].avgHatchPanelCycleTimeRocketLow, hatchRocketLow, 160);
      let hatchRocketMid = 0;
      hatchRocketMid = this.isEmpty(teamStats[k].avgHatchPanelCycleTimeRocketMid, hatchRocketMid, 160);
      let hatchRocketHigh = 0;
      hatchRocketHigh = this.isEmpty(teamStats[k].avgHatchPanelCycleTimeRocketHigh, hatchRocketHigh, 160);
      let lev3 = 0;
      lev3 = this.isEmpty(teamStats[k].avgClimbLevel3Time, lev3, 999);

      let array = <string[]>[teamStats[k].teamNumber, teamStats[k].teamName, teamStats[k].matchCount, cargoPickupScore, hatchPickupScore, teamStats[k].avgGamepieceCount, teamStats[k].avgCargoCount, teamStats[k].avgHatchPanelCount, teamStats[k].avgSandstormCargoCount, teamStats[k].avgSandstormHatchPanelCount, cargo, cargoCargoShip, cargoRocketLow, cargoRocketMid, cargoRocketHigh, hatch, hatchCargoShip, hatchRocketLow, hatchRocketMid, hatchRocketHigh, teamStats[k].climbLevel2Successes, teamStats[k].climbLevel3Successes, lev3, teamStats[k].liftLevel2Count, teamStats[k].liftLevel3Count, cargoPercent, hatchPercent, defenseScore, teamStats[k].foulCount, teamStats[k].failureCount];

      dataTemp.push({
        array: array,
        teamNumber: teamStats[k].teamNumber
      });
    }

    //Because ts is stupid and doesn't naturally sort by default.
    dataTemp.sort((a, b) => naturalSort(a.teamNumber, b.teamNumber));
    for(let g = 0; g < dataTemp.length; g++) {
      data.push(dataTemp[g].array);
    }
    
    let finalFileName = this.fileName + ".xlsx";
    //finalFileName += this.fileName, ".xlsx";

    let file = XLSX.utils.book_new();
    let sheet = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(file, sheet, this.fileName);
    XLSX.writeFile(file, finalFileName);
    //console.log(XLSX.writeFile(file, "YAY.xlsx"));
  }

  private isEmpty(toCheck: number, toAssign: number, doesEqual: number) {
    if(toCheck == doesEqual) {
      toAssign = <any>"";
    } else {
      toAssign = toCheck;
    }
    return toAssign;
  }

  private downloadJson(event, json) {
    let name = this.fileName + ".json";
    let file = new Blob([JSON.stringify(json)], {type: "application/json"});
    let a = document.createElement("a");
    let url = URL.createObjectURL(file);
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 0);
  }
}

function mapToJsonable(map: Map<any, any>) {
  let result = {};
  for(var key of map.keys()) {
    result[key] = map.get(key);
  }
  return result;
}
