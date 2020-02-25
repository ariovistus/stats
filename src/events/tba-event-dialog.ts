import { autoinject } from "aurelia-framework";
import { DialogController } from "aurelia-dialog";
import { TbaApi, District, tbaEvent } from "../tba-api";
import { FrcStatsContext, EventMatchEntity } from "../persistence";
import { gameManager, IGame } from "../games/index";

@autoinject
export class TbaEventDialog {
  year = "2018";
  chosenGame: IGame;
  customEventKey = "";
  customIsLoading = false;
  events: any[];
  games: IGame[];
  years: string[];

  constructor(
    private dbContext: FrcStatsContext,
    private tbaApi: TbaApi,
    private controller: DialogController) {
    this.events = [];
  }

  activate() {
    this.controller.settings.lock = false;
    this.controller.settings.overlayDismiss = true;
    
    this.games = gameManager.getGames();
    this.years = [];
    this.games[0].gameCode;
    this.years = this.games.map(function(x){return(x.gameCode)});
    this.years.sort();
    if(this.years.length != 0) {
      this.year = this.years[this.years.length - 1];
    }
    this.yearChanged();

    this.load();
  }

  load() {
    this.tbaApi.getEventList(this.year).then(events => {
      this.events = [];
      for(var evnt of events) {
        if(evnt.district && evnt.district.abbreviation == "pnw") {
          this.events.push(evnt);
        }
      }
      this.events.sort((a, b) => a.week - b.week);
    });
  }

  yearChanged() {
    var games = gameManager.getGamesForYear(this.year);
    if(games.length != 0) {
      this.chosenGame = games[0];
    }
    this.load();
  }

  importEvent(evnt: tbaEvent) {
    if(this.chosenGame == null) {
      alert('bad')
      return;
    }
    (<any>evnt).isLoading = true;
    this.saveEvent(evnt).then(x => {
      return this.saveDistrict(evnt.district);
    }).then(x => {
      return this.saveTeams(evnt);
    }).then(aValue => {
      return this.saveMatchEvent(evnt);
    }).then(() => {
      (<any>evnt).isLoading = false;
    }).catch(() => {
      (<any>evnt).isLoading = false;
    });
  }

  importByEventKey() {
    this.customIsLoading = true;
    this.tbaApi.getEvent(this.customEventKey).then(evnt => {
      return this.saveEvent(evnt).then(() => evnt);
    }).then(evnt => {
      return this.saveDistrict(evnt.district).then(() => evnt);
    }).then(evnt => {
      return this.saveTeams(evnt).then(() => evnt);
    }).then(evnt => {
      return this.saveMatchEvent(evnt);
    }).then(() => {
      this.customIsLoading = false;
    }).catch(() => {
      this.customIsLoading = false;
    });
  }

  private saveMatchEvent(evnt: tbaEvent)
  {
    return this.tbaApi.getEventMatches(evnt.key).then(matches =>{
      var someValue = 0;
		  matches.forEach(match => {
        if(match.comp_level == "qm"){
          let localMatch: EventMatchEntity = {
            year: this.chosenGame.gameCode,
            eventCode: evnt.event_code,
            matchNumber: ""+match.match_number,
            red1: "",
            red2: "",
            red3: "",
            blue1: "",
            blue2: "",
            blue3: "",
          };
          let promises1 = match.alliances.blue.team_keys.map((team_key, i) => {
            return this.dbContext.teams.where("tbaKey").equals(team_key).first().then(localTeam => {
              localMatch['blue' + (i+1)] = localTeam.teamNumber;
            })
          });
          let promises2 = match.alliances.red.team_keys.map((team_key, i) => {
            return this.dbContext.teams.where("tbaKey").equals(team_key).first().then(localTeam => {
              localMatch['red' + (i+1)] = localTeam.teamNumber;
            })
          });
          console.info(localMatch.eventCode, localMatch.matchNumber);
          Promise.all(promises1.concat(promises2)).then(z => {
            this.dbContext.eventMatches.put(localMatch);
          });
        }
        
      });
	  });
  }

  private getDistrictCode(district: District) {
    return district ? district.abbreviation : null;
  }

  private saveEvent(evnt: tbaEvent) {
    return this.dbContext.events.put({
      eventCode: evnt.event_code,
      name: evnt.name, 
      districtCode: this.getDistrictCode(evnt.district),
      tbaKey: evnt.key,
      calendarYear: ""+evnt.year,
      year: this.chosenGame.gameCode,
    });
  }

  private saveDistrict(district: District) {
    if (district == null) return Promise.resolve();

    let districtCode = district.abbreviation;

    return this.dbContext.districts
      .where('districtCode').equals(districtCode)
      .first().then(localDistrict => {
        if(localDistrict == null) {
          this.dbContext.districts.put({
            districtCode: districtCode,
            name: district.display_name,
          })
        }
      }).catch(error => {
        console.info('error saving district: ', district);
        throw error;
      });
  }

  private saveTeams(evnt: tbaEvent) {
    return Promise.all([
      this.dbContext.eventTeams
      .where(["year", "eventCode"])
      .equals([this.chosenGame.gameCode, evnt.event_code]).toArray(),
      this.tbaApi.getEventTeams(evnt.key),
    ]).then(results => {
      let localTeams = results[0];
      let importedTeams = results[1];

      if (importedTeams.length != 0){
        return {localTeams: localTeams, importedTeams: importedTeams};
      }else{
        return this.tbaApi.getEventMatches(evnt.key).then(matches => {
          let teamKeys = new Map<string, number>();
          matches.forEach(match => {
            match.alliances.blue.team_keys.forEach(key => teamKeys.set(key, 1));
            match.alliances.red.team_keys.forEach(key => teamKeys.set(key, 1));
          });
          let promises = Array.from(teamKeys.keys()).map(key => {
            return this.tbaApi.getTeamByKey(key);
          });

          return Promise.all(promises).then(importedTeams2 => {
            return {localTeams: localTeams, importedTeams: importedTeams2};
          })
        });
      }
    }).then(xx => {
      let localTeams = xx.localTeams;
      let importedTeams = xx.importedTeams;
      // todo: maybe warn if local has extra teams?
      let promises = importedTeams.map(team => {
          this.dbContext.eventTeams.put({
            year: this.chosenGame.gameCode,
            eventCode: evnt.event_code,
            teamNumber: ""+team.team_number,
          });

          return this.dbContext.teams
            .where("teamNumber").equals(""+team.team_number)
            .first().then(localTeam => {
              if(localTeam != null) return Promise.resolve(null);

              return this.dbContext.saveTeam(team, this.getDistrictCode(evnt.district));
            }).catch(error => {
              console.info('error saving team ', team);
              throw error;
            });
        });
        return Promise.all(promises);
    });
  }
}
