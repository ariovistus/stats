import Dexie from "dexie";
import { Team } from "./tba-api";

export class FrcStatsContext extends Dexie {
  teamMatches2018: Dexie.Table<TeamMatch2018Entity, number>;
  teamMatches2018V2: Dexie.Table<TeamMatch2018V2Entity, number>;
  teamMatches2019: Dexie.Table<TeamMatch2019Entity, number>;
  teamMatches2020: Dexie.Table<TeamMatch2020Entity, number>;
  teams: Dexie.Table<TeamEntity, number>;
  districts: Dexie.Table<DistrictEntity, number>;
  events: Dexie.Table<EventEntity, number>;
  eventTeams: Dexie.Table<EventTeamEntity, number>;
  games: Dexie.Table<GameEntity, number>;
  userPrefs: Dexie.Table<UserStateEntity, number>;
  eventMatches: Dexie.Table<EventMatchEntity, number>;
  bingos: Dexie.Table<BingoEntity, number>;

  constructor() {
    super('FrcStats')

    // in below contexts, "year" refers to gameCode, not calendar year
    this.version(1).stores({
      teamMatches2018: '++id, eventCode, teamNumber, matchNumber, [eventCode+matchNumber], [eventCode+teamNumber], &[eventCode+teamNumber+matchNumber]',
      teams: '++id, &teamNumber, districtCode, tbaKey',
      eventTeams: '++id, year, eventCode, teamNumber, [year+eventCode], &[year+eventCode+teamNumber]',
      districts: '++id, &districtCode',
      events: '++id, &eventCode, &[year+eventCode]',
      games: '++id, &year',
      userPrefs: '++id',
	    eventMatches: '++id, [year+eventCode], &[year+eventCode+matchNumber]',
    });

    this.version(2).stores({
      teamMatches2018V2: '++id, eventCode, teamNumber, matchNumber, [eventCode+matchNumber], [eventCode+teamNumber], &[eventCode+teamNumber+matchNumber]',
    }).upgrade(() => {
      // yay its a noop
    });

    this.version(3).stores({
      teamMatches2019: '++id, eventCode, teamNumber, matchNumber, [eventCode+matchNumber], [eventCode+teamNumber], &[eventCode+teamNumber+matchNumber]'
    }).upgrade(() => {
      // err noop again..
    });

    this.version(4).stores({
      events: '++id, eventCode, &[year+eventCode]',
    }).upgrade(() => {
      // bugger, y I never notice this?
    });

    this.version(5).stores({
      bingos: '++id, [year+eventCode]'
    }).upgrade(() => {
      // noop
    });

    this.version(6).stores({
      teamMatches2020: '++id, eventCode, teamNumber, matchNumber, [eventCode+matchNumber], [eventCode+teamNumber], &[eventCode+teamNumber+matchNumber]'
    }).upgrade(() => {
      // noop
    });

    this.games.put({
      year: '2018',
      name: 'FIRST POWER UP',
    }).catch(error => {
      if(error.name == 'ConstraintError') {
        // u weird, chrome
        return;
      }
      throw error;
    });

    this.games.put({
      year: '2019',
      name: 'FIRST DEEP SPACE',
    }).catch(error => {
      if(error.name == 'ConstraintError') {
        // u weird, chrome
        return;
      }
      throw error;
    });

    this.games.put({
      year: '2020',
      name: 'FIRST INFINITE RECHARGE',
    }).catch(error => {
      if(error.name == 'ConstraintError') {
        // u weird, chrome
        return;
      }
      throw error;
    });
  }

  getTeam(teamNumber: string|number) {
    return this.teams.where("teamNumber").equals(""+teamNumber).first();
  }

  saveTeam(team: Team, districtCode: string) {
    return this.teams.put({
      teamNumber: ""+team.team_number,
      teamName: ""+team.nickname,
      description: ""+team.name,
      city: team.city,
      stateprov: team.state_prov,
      country: team.country,
      districtCode: districtCode,
      tbaKey: team.key,
    });
  }

  getEventTeams(year: string, eventCode: string): Promise<EventTeamEntity[]> {
    return this.eventTeams.where(["year", "eventCode"]).equals([year, eventCode]).toArray();
  }

  getEvent(year: string, eventCode: string): Promise<EventEntity> {
    return this.events
      .where(["year", "eventCode"])
      .equals([year, eventCode])
      .first().then(event => {
        if(event != null && event.calendarYear == null) {
          event.calendarYear = event.year;
        }
        return event;
      });
  }

  getAllEvents(): Promise<EventEntity[]> {
    return this.events.toArray().then(events => {
      for(var event of events) {
        if(event.calendarYear == null) {
          event.calendarYear = event.year;
        }
      }
      return events;
    })
  }

  getEventMatches(year: string, eventCode: string): Promise<EventMatchEntity[]> {
    return this.eventMatches
      .where(["year", "eventCode"])
      .equals([year, eventCode]).toArray();
  }

  getEventMatch(year: string, eventCode: string, matchNumber: string): Promise<EventMatchEntity> {
    return this.eventMatches
      .where(["year", "eventCode", "matchNumber"])
      .equals([year, eventCode, matchNumber]).first();
  }

  getTeamMatches2018(opts: TeamMatchOpts) {
    if('teamNumber' in opts) {
      return this.teamMatches2018
      .where(["eventCode", "teamNumber", "matchNumber"])
      .equals([opts.eventCode, opts.teamNumber, opts.matchNumber])
      .toArray()
    }else if('matchNumber' in opts) {
      return this.teamMatches2018
        .where(["eventCode", "matchNumber"])
        .equals([opts.eventCode, opts.matchNumber])
        .toArray()
    }else{
      return this.teamMatches2018
        .where("eventCode")
        .equals(opts.eventCode).toArray();
    }
  }

  getTeamMatches2019(opts: TeamMatchOpts): Promise<TeamMatch2019Entity[]> {
    if('teamNumber' in opts && 'matchNumber' in opts) {
      return this.teamMatches2019
      .where(["eventCode", "teamNumber", "matchNumber"])
      .equals([opts.eventCode, opts.teamNumber, opts.matchNumber])
      .toArray();
    }else if('teamNumber' in opts && !('matchNumber' in opts)) {
      return this.teamMatches2019
      .where(["eventCode", "teamNumber"])
      .equals([opts.eventCode, opts.teamNumber])
      .toArray();
    }else if('matchNumber' in opts) {
      return this.teamMatches2019
        .where(["eventCode", "matchNumber"])
        .equals([opts.eventCode, opts.matchNumber])
        .toArray();
    }else{
      return this.teamMatches2019
        .where("eventCode")
        .equals(opts.eventCode).toArray();
    }
  }

  getTeamMatches2020(opts: TeamMatchOpts): Promise<TeamMatch2020Entity[]> {
    if('teamNumber' in opts && 'matchNumber' in opts) {
      return this.teamMatches2020
      .where(["eventCode", "teamNumber", "matchNumber"])
      .equals([opts.eventCode, opts.teamNumber, opts.matchNumber])
      .toArray();
    }else if('teamNumber' in opts && !('matchNumber' in opts)) {
      return this.teamMatches2020
      .where(["eventCode", "teamNumber"])
      .equals([opts.eventCode, opts.teamNumber])
      .toArray();
    }else if('matchNumber' in opts) {
      return this.teamMatches2020
        .where(["eventCode", "matchNumber"])
        .equals([opts.eventCode, opts.matchNumber])
        .toArray();
    }else{
      return this.teamMatches2020
        .where("eventCode")
        .equals(opts.eventCode).toArray();
    }
  }

  getUserPrefs(): Promise<UserStateEntity>{
    return this.userPrefs.toArray().then(userPrefs => {
      if(userPrefs != null && userPrefs.length != 0){
        return userPrefs[0];
      }
      else{
        let userPref: UserStateEntity = makeUserPrefs();
        return this.userPrefs.put(userPref).then(id => {
          userPref.id = id;
          return userPref;
        });
      }
    });
  }

  getBingo(year: string, eventCode: string): Promise<BingoEntity[]> {
    return this.bingos.where(["year", "eventCode"]).equals([year, eventCode]).toArray();
  }
  
}

export interface TeamMatchOpts {
  eventCode: string;
  matchNumber?: string;
  teamNumber?: string;
}

export interface IEventTeamMatch {
	eventCode: string;
	teamNumber: string;
	matchNumber: string;
}

export interface TeamMatch2018Entity extends IEventTeamMatch, PowerupBingo {
  id?: number;
	eventCode: string;
	teamNumber: string;
	matchNumber: string;

	isFailure: boolean;
	failureReason: string;
	allySwitchCount: number;
  allySwitchCycleTime: number
	oppoSwitchCount: number;
  oppoSwitchCycleTime: number
	scaleCount: number;
	scaleCycleTime: number;
  vaultCount: number;
  vaultCycleTime: number;
  climbed: boolean;
  lifted: string[];
	isFoul: boolean;
	foulReason: string;
	cubeCount: number;
  notes: string;
  startingPosition: string;
  autoCrossedLine: boolean;
  autoScaleCount: number;
  autoSwitchCount: number;
  autoScaleWrongSide: boolean;
  autoSwitchWrongSide: boolean;
  autoVault: boolean;
  autoAttemptedSwitch: boolean;
  autoAttemptedScale: boolean;
  autoNotes: string;
  scaleMechanism: string;
  scaleMechanismOther: string;
  scaleKnockedOutCount: number;
  scaleDroppedCount: number;
  attemptedClimb: boolean;
  liftedBy: string;
  strategy: string;
}

export interface TeamMatch2018V2Entity extends IEventTeamMatch, PowerupBingo {
  id?: number;
	eventCode: string;
	teamNumber: string;
	matchNumber: string;

  actions: PowerUpAction[];
	isFailure: boolean;
	failureReason: string;
	isFoul: boolean;
	foulReason: string;
  notes: string;
  startingPosition: string;
  autoCrossedLine: boolean;
  autoNotes: string;
  scaleMechanism: string;
  scaleMechanismOther: string;
  strategy: string;
}

export interface PowerUpAction {
  actionTypeId: number;
  time: number;
}

export interface PowerupBingo {
  bingoSovietRussia: boolean;
  bingoGrunt: boolean;
  bingoFullHouse: boolean;
  bingoJudges: boolean;
  bingoYoink: boolean;
  bingoScalePlateHang: boolean;
  bingoDieInNull: boolean;
  bingoPushedInNull: boolean;
  bingoClotheslined: boolean;
  bingoWedged: boolean;
  bingoPowerUpsExist: boolean;
  bingoBoost: boolean;
  bingoForceTime: boolean;
  bingoClimbPlatform: boolean;
  bingoScaleBeach: boolean;
  bingoPyramid: boolean;
  bingoTimber: boolean;
  bingoClimbsGiven: boolean;
  bingoPlatformZone: boolean;
  bingoSkydivingClub: boolean;
  bingoCongaClimb: boolean;
  bingoWindchimeClimb: boolean;
  bingoLiftlessClimb: boolean;
  bingo3xClimb: boolean;
}

export interface TeamMatch2019Entity extends IEventTeamMatch {
  id?: number;
  /** */
  cargoPickup: QualitativeNumeric;
  /** */
  hatchPanelPickup: QualitativeNumeric;
  /** */
  placements: DeepSpaceEvent[];
  /**Determines whether or not the robot attempted to climb the second level of the pedestal. */
  level2ClimbAttempted: boolean;
  /**Determines whether or not the robot successfully climbed to the second level of the pedestal. */
  level2ClimbSucceeded: boolean;
  /**Determines whether or not the robot attempted to climb to the third level of the pedestal. */
  level3ClimbAttempted: boolean;
  /**Determines whether or not the robot successfully climbed to the third level of the pedestal. */
  level3ClimbSucceeded: boolean;
  /**Determines when the robot started to climb to the third level of the pedestal. */
  level3ClimbBegin: number;
  /**Determines when the robot finished climbing to the third level of the pedestal. */
  level3ClimbEnd: number;
  /**Stores the team numbers of the robots lifted by this robot to the third level of the pedestal. */
  lifted: string[];
  wasLifted: boolean;
  liftedSomeone: boolean;
  /**Stores the team number of the robot that lifted this robot to the third level of the pedestal. */
  liftedBy: string;
  /**Determines whether or not a robot failure occurred. */
  isFailure: boolean;
  /**A more descriptive version of isFailure. */
  failureReason: string;
  /**Determines whether or not the robot caused a foul. */
  isFoul: boolean;
  /**A more descriptive version of isFoul. */
  foulReason: string;
  /**Anything deemed important by the user. */
  notes: string;
  /**Helps determine if lifted teams were lifted to the third level of the pedestal. */
  didLiftLevel3: boolean;
  /**Rating of defensive capability. */
  defenseCapability: QualitativeNumeric;
  defenseWeaknesses: string;
}

export interface DeepSpaceEvent {
  eventType: DeepSpaceEventType;

  // eventType == "Gamepiece Placement"
  gamepiece?: DeepSpaceGamepiece;
  location?: DeepSpaceLocation;
  when?: number;
  sandstorm?: boolean;

  // eventType == "Begin Other Noncycle"
  description?: string;
}

export type DeepSpaceEventType = "Begin Defense" | "End Defense" | "Begin Other Noncycle" | "End Other Noncycle" | "Gamepiece Placement";
export type DeepSpaceGamepiece = "Cargo" | "Hatch Panel";
export type DeepSpaceLocation = "Cargo Ship" | "Rocket Low" | "Rocket Mid" | "Rocket High";

export var allDeepSpaceGamepieceTypes: DeepSpaceGamepiece[] = ["Cargo", "Hatch Panel"];
export var allDeepSpaceLocations: DeepSpaceLocation[] = ["Cargo Ship", "Rocket Low", "Rocket Mid", "Rocket High"];

export type QualitativeNumeric = 0 | 10 | 20 | 30 | 40;
export interface QualitativeAnswer {
  numeric: QualitativeNumeric;
  name: string;
}
export var qualitativeAnswers : QualitativeAnswer[] = [
  { numeric: 0, name: "N/A" },
  { numeric: 10, name: "Poor" },
  { numeric: 20, name: "Decent"},
  { numeric: 30, name: "Good" },
  { numeric: 40, name: "Excellent"}
]

export interface TeamMatch2020Entity extends IEventTeamMatch {
  id?: number;

  /**AUTONOMUS */

  /**Determines where  the robot will be starting on the field */
  startingPosition: string;
  /**Determines if a robot successfully got the lowest point value in auto */
  autoCrossedLine: boolean;
  /**Count of high outer goals robot scored in auto */
  autoHighGoal: number;
  /**Count of high inner goals robot scored in auto */
  autoHighInnerGoal: number;
  /**Count of low goals robot scored in auto */
  autoLowGoal: number;
  /**Determines if a robot did nothing the entire match */
  deadOnField: boolean;
  /**Determines if a robot spun out of control on the field */
  spinnyBois: boolean;
  
  /*TELEOPERATED */

  /**Count of high outer goals robot scored in teleop */
  teleopHighGoal: number;
  /**Count of high inner goals robot scored in teleop */
  teleopHighInnerGoal: number;
  /**Count of low goals robot scored in teleop */
  teleopLowGoal: number;
  powerCellPickup: QualitativeNumeric;
  /**Determines if the control panel rotation task was attempted */
  controlPanelRotationAttempted: boolean;
  /**Determines if the control panel rotation attempt was successful */
  controlPanelRotationSucceeded: boolean;
  /**Remaining number of seconds at the start of the control panel rotation attempt */
  controlPanelRotationBegin: number;
  /**Remaining number of seconds at the end of the control panel rotation attempt */
  controlPanelRotationEnd: number;
  /**Determines if the control panel position task was attempted */
  controlPanelPositionAttempted: boolean;
  /**Determines if the control panel position attempt was successful */
  controlPanelPositionSucceeded: boolean;
  /**Remaining number of seconds at the start of the control panel position attempt */
  controlPanelPositionBegin: number;
  /**Remaining number of seconds at the end of the control panel position attempt */
  controlPanelPositionEnd: number;
  /**END GAME */
  /**Determines whether or not the robot attempted to climb*/
  climbAttempted: boolean;
  /**Determines whether or not the robot successfully climbed */
  climbSucceeded: boolean;
  /**Remaining number of seconds at the start of the climb attempt */
  climbBegin: number;
  /**Remaining number of seconds at the end of the climb attempt */
  climbEnd: number;
  /**Stores the team numbers of the robots lifted by this robot to the third level of the pedestal. */
  lifted: string[];
  liftedSomeone: boolean;

  /**NOTES AND MISCELLANEOUS */
  
  /**Determines whether or not a robot failure occurred. */
  isFailure: boolean;
  /**A more descriptive version of isFailure. */
  failureReason: string;
  /**Determines whether or not the robot or drive team caused a foul. */
  isFoul: boolean;
  /**A more descriptive version of isFoul. */
  foulReason: string;
  /**Anything deemed important by the user. */
  notes: string;
  /**Rating of defensive capability. */
  defenseCapability: QualitativeNumeric;
  defenseWeaknesses: string;
}

export function make2018match(eventCode, teamNumber, matchNumber): TeamMatch2018Entity {
  return {
    autoScaleCount: 0,
    autoSwitchCount: 0,
    autoScaleWrongSide: false,
    autoSwitchWrongSide: false,
    autoVault: false,
    autoAttemptedScale: false,
    autoAttemptedSwitch: false,
    autoNotes: "",
    scaleDroppedCount: 0,
    scaleMechanism: "",
    scaleMechanismOther: "",
    scaleKnockedOutCount: 0,
    attemptedClimb: false,
    liftedBy: "",
    strategy: "",
    eventCode: eventCode,
    teamNumber: teamNumber,
    matchNumber: matchNumber,
    allySwitchCount: 0,
    allySwitchCycleTime: 150,
    oppoSwitchCount: 0,
    oppoSwitchCycleTime: 150,
    scaleCount: 0,
    scaleCycleTime: 150,
    vaultCount: 0,
    vaultCycleTime: 150,
    climbed: false,
    lifted: [],

    isFailure: false,
    failureReason: "",
    isFoul: false,
    foulReason: "",
    cubeCount: 0,
    notes: "",
    startingPosition: null,
    autoCrossedLine: false,

    bingoSovietRussia: false,
    bingoGrunt: false,
    bingoFullHouse: false,
    bingoJudges: false,
    bingoYoink: false,
    bingoScalePlateHang: false,
    bingoDieInNull: false,
    bingoPushedInNull: false,
    bingoClotheslined: false,
    bingoWedged: false,
    bingoPowerUpsExist: false,
    bingoBoost: false,
    bingoForceTime: false,
    bingoClimbPlatform: false,
    bingoScaleBeach: false,
    bingoPyramid: false,
    bingoTimber: false,
    bingoClimbsGiven: false,
    bingoPlatformZone: false,
    bingoSkydivingClub: false,
    bingoCongaClimb: false,
    bingoWindchimeClimb: false,
    bingoLiftlessClimb: false,
    bingo3xClimb: false,
  };

}


export function make2019match(eventCode: string, teamNumber: string, matchNumber: string): TeamMatch2019Entity {
  return {
    eventCode: eventCode,
    teamNumber: teamNumber,
    matchNumber: matchNumber,

    cargoPickup: 0,
    isFailure: false,
    failureReason: null,
    isFoul: false,
    foulReason: null,
    hatchPanelPickup: 0,
    level2ClimbAttempted: false,
    level2ClimbSucceeded: false,
    level3ClimbAttempted: false,
    level3ClimbBegin: null,
    level3ClimbEnd: null,
    level3ClimbSucceeded: false,
    lifted: [],
    liftedBy: null,
    wasLifted: false,
    liftedSomeone: false,
    notes: null,
    placements: [],
    didLiftLevel3: false,
    defenseCapability: 0,
    defenseWeaknesses: null,
  };
}

export function make2020match(eventCode: string, teamNumber: string, matchNumber: string): TeamMatch2020Entity {
  return {
    eventCode: eventCode,
    teamNumber: teamNumber,
    matchNumber: matchNumber,
    
    /**AUTONOMUS */
    startingPosition: null,
    autoCrossedLine: false,
    autoHighGoal: 0,
    autoHighInnerGoal: 0,
    autoLowGoal: 0,

    /**TELEOPERATED */
    teleopHighGoal: 0,
    teleopHighInnerGoal: 0,
    teleopLowGoal: 0,
    deadOnField: false,
    spinnyBois: false,
    powerCellPickup: 0,
    controlPanelRotationAttempted: false,
    controlPanelRotationSucceeded: false,
    controlPanelRotationBegin: 135,
    controlPanelRotationEnd: 0,
    controlPanelPositionAttempted: false,
    controlPanelPositionSucceeded: false,
    controlPanelPositionBegin: 135,
    controlPanelPositionEnd: 0,

    /**END GAME */
    climbAttempted: false,
    climbSucceeded: false,
    climbBegin: 20,
    climbEnd: 0,
    lifted: [],
    liftedSomeone: false,
    isFailure: false,
    failureReason: null,
    isFoul: false,
    foulReason: null,
    notes: null,
    defenseCapability: 0,
    defenseWeaknesses: null,
  }
}


export function matches2018AreEqual(a: TeamMatch2018Entity, b: TeamMatch2018Entity) {
  if(a == null && b != null || a != null && b == null) return false;
  return (
    a.eventCode == b.eventCode &&
    a.teamNumber == b.teamNumber &&
    a.matchNumber == b.matchNumber &&
    a.allySwitchCount == b.allySwitchCount &&
    a.allySwitchCycleTime == b.allySwitchCycleTime &&
    a.oppoSwitchCount == b.oppoSwitchCount &&
    a.oppoSwitchCycleTime == b.oppoSwitchCycleTime &&
    a.scaleCount == b.scaleCount &&
    a.scaleCycleTime == b.scaleCycleTime &&
    a.vaultCount == b.vaultCount &&
    a.vaultCycleTime == b.vaultCycleTime &&
    a.climbed == b.climbed &&
    (a.lifted == null && b.lifted == null ||
     a.lifted.length == b.lifted.length) &&
    a.isFailure == b.isFailure &&
    a.failureReason == b.failureReason &&
    a.isFoul == b.isFoul &&
    a.foulReason == b.foulReason &&
    a.cubeCount == b.cubeCount &&
    a.notes == b.notes &&
    a.startingPosition == b.startingPosition &&
    a.autoCrossedLine == b.autoCrossedLine &&
    a.autoScaleCount == b.autoScaleCount &&
    a.autoAttemptedScale == b.autoAttemptedScale &&
    a.autoAttemptedSwitch == b.autoAttemptedSwitch &&
    a.autoNotes == b.autoNotes &&
    a.autoScaleWrongSide == b.autoScaleWrongSide &&
    a.autoSwitchCount == b.autoSwitchCount &&
    a.autoSwitchWrongSide == b.autoSwitchWrongSide &&
    a.autoVault == b.autoVault &&
    a.scaleDroppedCount == b.scaleDroppedCount &&
    a.scaleKnockedOutCount == b.scaleKnockedOutCount &&
    a.scaleMechanism == b.scaleMechanism &&
    a.attemptedClimb == b.attemptedClimb &&
    a.liftedBy == b.liftedBy &&
    a.strategy == b.strategy &&
    a.bingoSovietRussia == b.bingoSovietRussia &&
    a.bingoGrunt == b.bingoGrunt &&
    a.bingoFullHouse == b.bingoFullHouse &&
    a.bingoJudges == b.bingoJudges &&
    a.bingoYoink == b.bingoYoink &&
    a.bingoScalePlateHang == b.bingoScalePlateHang &&
    a.bingoDieInNull == b.bingoDieInNull &&
    a.bingoPushedInNull == b.bingoPushedInNull &&
    a.bingoClotheslined == b.bingoClotheslined &&
    a.bingoWedged == b.bingoWedged &&
    a.bingoPowerUpsExist == b.bingoPowerUpsExist &&
    a.bingoBoost == b.bingoBoost &&
    a.bingoForceTime == b.bingoForceTime &&
    a.bingoClimbPlatform == b.bingoClimbPlatform &&
    a.bingoScaleBeach == b.bingoScaleBeach &&
    a.bingoPyramid == b.bingoPyramid &&
    a.bingoTimber == b.bingoTimber &&
    a.bingoClimbsGiven == b.bingoClimbsGiven &&
    a.bingoPlatformZone == b.bingoPlatformZone &&
    a.bingoSkydivingClub == b.bingoSkydivingClub &&
    a.bingoCongaClimb == b.bingoCongaClimb &&
    a.bingoWindchimeClimb == b.bingoWindchimeClimb &&
    a.bingoLiftlessClimb == b.bingoLiftlessClimb &&
    a.bingo3xClimb == b.bingo3xClimb 
  );
}

export function matches2019AreEqual(a: TeamMatch2019Entity, b: TeamMatch2019Entity) {
  if(a == null && b != null || a != null && b == null) return false;

  return (
    a.eventCode == b.eventCode &&
    a.teamNumber == b.teamNumber &&
    a.matchNumber == b.matchNumber &&
    a.cargoPickup == b.cargoPickup &&
    a.hatchPanelPickup == b.hatchPanelPickup &&
    matches2019PlacementsAreEqual(a, b) &&
    a.level2ClimbAttempted == b.level2ClimbAttempted &&
    a.level2ClimbSucceeded == b.level2ClimbSucceeded &&
    a.level3ClimbAttempted == b.level3ClimbAttempted &&
    a.level3ClimbSucceeded == b.level3ClimbSucceeded &&
    a.level3ClimbBegin == b.level3ClimbBegin &&
    a.level3ClimbEnd == b.level3ClimbEnd &&
    liftedAreEqual(a.lifted, b.lifted) &&
    a.isFailure == b.isFailure &&
    a.failureReason == b.failureReason &&
    a.isFoul == b.isFoul &&
    a.foulReason == b.foulReason &&
    a.notes == b.notes &&
    a.liftedBy == b.liftedBy
  );
}

export function matches2020AreEqual(a: TeamMatch2020Entity, b: TeamMatch2020Entity) {
  if(a == null && b != null || a != null && b == null) return false;

  return (
    a.eventCode == b.eventCode &&
    a.teamNumber == b.teamNumber &&
    a.matchNumber == b.matchNumber &&
    a.climbAttempted == b.climbAttempted &&
    a.climbSucceeded == b.climbSucceeded &&
    a.climbBegin == b.climbBegin &&
    a.climbEnd == b.climbEnd &&
    liftedAreEqual(a.lifted, b.lifted) &&
    a.isFailure == b.isFailure &&
    a.failureReason == b.failureReason &&
    a.isFoul == b.isFoul &&
    a.foulReason == b.foulReason &&
    a.notes == b.notes
  )
}

export function liftedAreEqual(lifted1: string[], lifted2: string[]) {
  if(lifted1 == null || lifted2 == null) {
    return lifted2 == lifted2;
  }
  if(lifted1.length != lifted2.length) {
    return false;
  }
  for(var item of lifted1) {
    if(lifted2.indexOf(item) == -1) {
      return false;
    }
  }
  return true;
}

export function matches2019PlacementsAreEqual(a: TeamMatch2019Entity, b: TeamMatch2019Entity) {
  if(a == null || a.placements == null || b == null || b.placements == null) {
    return false;
  }

  if(a.placements.length != b.placements.length) {
    return false;
  }
  for(var i = 0; i < a.placements.length; i++) {
    let pa = a.placements[i];
    let pb = b.placements[i];
    if(pa.eventType != pb.eventType) {
      return false;
    }
    if(pa.eventType == "Gamepiece Placement") {
      let areEqual = (
        pa.gamepiece == pb.gamepiece && 
        pa.location == pb.location &&
        pa.when == pb.when &&
        pa.sandstorm == pb.sandstorm
      )
      if(!areEqual) {
        return false;
      }
    }
  }

  return true;
}

export function make2018v2match(eventCode, teamNumber, matchNumber): TeamMatch2018V2Entity {
  return {
    eventCode: eventCode,
    teamNumber: teamNumber,
    matchNumber: matchNumber,

    actions: [],
    isFailure: false,
    failureReason: "",
    isFoul: false,
    foulReason: "",
    notes: "",
    startingPosition: "",
    autoCrossedLine: false,
    autoNotes: "",
    scaleMechanism: "",
    scaleMechanismOther: "",
    strategy: "",

    bingoSovietRussia: false,
    bingoGrunt: false,
    bingoFullHouse: false,
    bingoJudges: false,
    bingoYoink: false,
    bingoScalePlateHang: false,
    bingoDieInNull: false,
    bingoPushedInNull: false,
    bingoClotheslined: false,
    bingoWedged: false,
    bingoPowerUpsExist: false,
    bingoBoost: false,
    bingoForceTime: false,
    bingoClimbPlatform: false,
    bingoScaleBeach: false,
    bingoPyramid: false,
    bingoTimber: false,
    bingoClimbsGiven: false,
    bingoPlatformZone: false,
    bingoSkydivingClub: false,
    bingoCongaClimb: false,
    bingoWindchimeClimb: false,
    bingoLiftlessClimb: false,
    bingo3xClimb: false,
  };
}

export interface EventTeamEntity {
  id?: number;
	year: string;
	eventCode: string;
	teamNumber: string;
}

export interface TeamEntity {
  id?: number;
  teamNumber: string;
  teamName: string;
  description: string;
  city: string;
  stateprov: string;
  country: string;
  districtCode: string;

  tbaKey?: string;
}

export interface DistrictEntity {
  id?: number;
  districtCode: string;
  name: string;
}

export interface EventEntity {
  id?: number;
  eventCode: string;
  name: string;
  districtCode: string;
  year: string;
  calendarYear: string;

  tbaKey?: string;
  scheduleEditable?: boolean;
  scoutingMode?: "smes" | "swimlanes";
  smes?: Map<string, string[]>;
  selectedSME?: string;
}

export interface GameEntity {
  id?: number;
  year: string;
  name: string;
}

export interface UserStateEntity {
  id?: number;

  currentEventId: number;
  currentYear: string;
  lastMatchNumber: number;
  qrType: TypeNumber;
  mehWereNotPicking?: boolean;
  qrcodeMirrored: boolean;
}

export interface EventMatchEntity {
	id?: number;
	
	year: string;
	eventCode: string;
	matchNumber: string;
  red1: string;
  red2: string;
  red3: string;
  blue1: string;
  blue2: string;
  blue3: string;

  winPrediction?: WinPrediction;
  redRP?: number;
  blueRP?: number;
}

export type WinPrediction = "Blue" | "Red" | "Tie";

export interface BingoEntity {
  id?: number;

  year: string;
  eventCode: string;
  cell: string;
  matchNumber: string;
  teamNumber: string;
  notes: string;
}

export function makeBingoEntity(year: string, eventCode: string, cell: string): BingoEntity {
  return {
    year: year,
    eventCode: eventCode,
    cell: cell,
    matchNumber: null,
    teamNumber: null,
    notes: null,
  };
}

export interface EventMatchSlot {
  prop: string;
  name: string;
}

export var EventMatchSlots: EventMatchSlot[] = [
  { prop: "red1", name: "Red 1"},
  { prop: "red2", name: "Red 2"},
  { prop: "red3", name: "Red 3"},
  { prop: "blue1", name: "Blue 1"},
  { prop: "blue2", name: "Blue 2"},
  { prop: "blue3", name: "Blue 3"},
];

export function makeEventMatch(year: string, eventCode: string, matchNumber: string): EventMatchEntity {
  return {
    year: year,
    eventCode: eventCode,
    matchNumber: matchNumber,
    red1: "",
    red2: "",
    red3: "",
    blue1: "",
    blue2: "",
    blue3: "",
  };
}

export function makeUserPrefs(): UserStateEntity{
  return {
    currentEventId: null,
    qrType: 12,
    currentYear: "",
    lastMatchNumber: null,
    qrcodeMirrored: false,
  };
}

export function eventMatchesAreEqual(a: EventMatchEntity, b: EventMatchEntity): boolean {
  if(a == null && b != null || a != null && b == null) return false;
  return (a.matchNumber == b.matchNumber && a.year == b.year && a.eventCode == b.eventCode &&
    a.red1 == b.red1 && a.red2 == b.red2 && a.red3 == b.red3  &&
    a.blue1 == b.blue1 && a.blue2 == b.blue2 && a.blue3 == b.blue3);
}
