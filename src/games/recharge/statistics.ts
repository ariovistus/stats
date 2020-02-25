import { QualitativeAnswer, TeamMatch2020Entity, qualitativeAnswers, TeamEntity, QualitativeNumeric } from "../../persistence";
import { print } from "util";

export class RechargeTeamStatistics {
  teamName: string;
	year: string;
  eventCode: string;
  teamNumber: string;

  /**The average score the team's robot earned for all scoring tasks. */
  avgTotalScore: number;
  /**The max score the team's robot earned for all scoring tasks. */
  maxTotalScore: number;

  /**The average score the team's robot earned for power cells scored in all positions. */
  avgGamepieceScore: number;
  /**The max score the team's robot earned for power cells scored in all positions. */
  maxGamepieceScore: number;
  /**The average number of power cells scored by the team's robot in all positions. */
  avgGamepieceCount: number;
  /**The max number of power cells scored placed by the team's robot in all positions. */
  maxGamepieceCount: number;
  /**The average number of power cells scored by the team's robot in all positions. */
  avgGamepieceAutoCount: number;
  /**The max number of power cells scored placed by the team's robot in all positions. */
  maxGamepieceAutoCount: number;
  /**The average number of power cells scored by the team's robot in the low goal. */
  avgLowGoalCount: number;
  /**The max number of power cells scored placed by the team's robot in the low goal. */
  maxLowGoalCount: number;
  /**The average number of power cells scored by the team's robot in the in outer high. */
  avgHighGoalCount: number;
  /**The max number of power cells scored placed by the team's robot in outer high. */
  maxHighGoalCount: number;
  /**The average number of power cells scored by the team's robot in the in inner high. */
  avgHighInnerGoalCount: number;
  /**The max number of power cells scored placed by the team's robot in inner high. */
  maxHighInnerGoalCount: number;
  /** blah */
  autoLowGoalCount: number;
  /** blah */
  teleopLowGoalCount: number;
  /** blah */
  autoHighGoalCount: number;
  /** blah */
  teleopHighGoalCount: number;
  /** blah */
  autoHighInnerGoalCount: number;
  /** blah */
  teleopHighInnerGoalCount: number;

  rotationAttempts: number;
  rotationSuccesses: number;
  rotationAvgTime: number;
  positionAttempts: number;
  positionSuccesses: number;
  positionAvgTime: number;
  crossedLineCount: number;
  /**The number of matches where a team placed at least one cargo. */
  gamepiecePlacedMatchCount: number;
  /**The number of matches a team has played. */
  matchesPlayed: number;
  /**A rating of how effectively a team can pick up cargo. */
  gamepiecePickup: QualitativeAnswer;
  /**A rating of how effectively a team can pick up hatch panels. */
  hatchPanelPickup: QualitativeAnswer;
  /**Number of times a team has attemped to climb to the third level of the pedestal. */
  climbAttempts: number;
  /**Number of times a team has successfully climbed to the third level of the pedestal. */
  climbSuccesses: number;
  /**The time it took for a team to climb to the third level of the pedestal. */
  avgClimbTime: number;
  /**The number of teams a team has lifted. */
  liftCount: number;
  /**The number of matches that contain data for a team. */
  matchCount: number;
  /**The percentage of matches where a team placed power cells. */
  gamepiecePercent: number;
  /**A rating of how efficient a robot's drivetrain is. */
  drivetrainStrength: QualitativeAnswer;
  /**Notes on the vulnerabilities of a robot's drivetrain. */
  defenseWeaknesses: string;
  /**Foul count. */
  foulCount: number;
  /**number of fools scouting data, excluding programmers */
  foolCount: number;
  /**Failure count. */
  failureCount: number;
}

export function makeTeamStats(team: TeamEntity, x: TeamMatch2020Entity[]): RechargeTeamStatistics {
  let result = new RechargeTeamStatistics();
  //Many many vars created just for the for loop below.
  let powerCellPickupRatings = [];
  let drivetrainStrengthRatings = [];
  let climbTimes = [];
  let positionTimes = [];
  let rotationTimes = [];

  result.matchCount = 0;

  result.liftCount = 0;

  result.matchesPlayed = x.length;
  result.defenseWeaknesses = "";
  result.avgClimbTime = 999;
  result.foulCount = 0;
  result.failureCount = 0;

  result.rotationAttempts = 0;
  result.rotationSuccesses = 0;
  result.rotationAvgTime = 999;

  result.positionAttempts = 0;
  result.positionSuccesses = 0;
  result.positionAvgTime = 999;

  result.matchCount = x.length;
  result.maxTotalScore = 0;
  result.maxGamepieceCount = 0;
  result.maxGamepieceAutoCount = 0;
  result.maxGamepieceScore = 0;
  result.maxLowGoalCount = 0;
  result.maxHighGoalCount = 0;
  result.maxHighInnerGoalCount = 0;
  result.autoLowGoalCount = 0;
  result.teleopLowGoalCount = 0;
  result.autoHighGoalCount = 0;
  result.teleopHighGoalCount = 0;
  result.autoHighInnerGoalCount = 0;
  result.teleopHighInnerGoalCount = 0;
  result.climbSuccesses = 0;
  result.rotationSuccesses = 0;
  result.positionSuccesses = 0;
  result.climbAttempts = 0;
  result.rotationAttempts = 0;
  result.positionAttempts = 0;
  result.crossedLineCount = 0;

  result.teamNumber = team.teamNumber;
  result.teamName = team.teamName;

  //This for loop is a nightmare.
  for(var i = 0; i < x.length; i++) {

    if(x[i].isFoul) {
      result.foulCount++;
    }
    if(x[i].isFailure) {
      result.failureCount++;
    }

    let autoLowGoal = +(x[i].autoLowGoal || 0);
    let autoHighGoal = +(x[i].autoHighGoal || 0);
    let autoHighInnerGoal = +(x[i].autoHighInnerGoal || 0);
    let lowGoal = +(x[i].teleopLowGoal || 0);
    let highGoal = +(x[i].teleopHighGoal || 0);
    let highInnerGoal = +(x[i].teleopHighInnerGoal || 0);

    let crossedLine = x[i].autoCrossedLine;
    if(crossedLine) {
      result.crossedLineCount ++;
    }


    function setMax(value, prop) {
      if(value > result[prop]) {
        result[prop] = value;
      }
    }

    let score = calculateScore(autoLowGoal, autoHighGoal, autoHighInnerGoal, lowGoal, highGoal, highInnerGoal);
    setMax(score, 'maxGamepieceScore');

    let totalScore = (score + 
      (x[i].climbSucceeded ? 25 : 0) + 
      (x[i].controlPanelRotationSucceeded ? 10 : 0) + 
      (x[i].controlPanelPositionSucceeded ? 20 : 0) + 
      (crossedLine ? 5 : 0));
    setMax(totalScore, 'maxTotalScore');

    let total = autoLowGoal + autoHighGoal + autoHighInnerGoal + lowGoal + highGoal + highInnerGoal;
    setMax(total, 'maxGamepieceCount');

    let autoTotal = autoLowGoal + autoHighGoal + autoHighInnerGoal;
    setMax(autoTotal, 'maxGamepieceAutoCount');

    setMax(autoLowGoal + lowGoal, 'maxLowGoalCount');
    setMax(autoHighGoal + highGoal, 'maxHighGoalCount');
    setMax(autoHighInnerGoal + highInnerGoal, 'maxHighGoalCount');


    result.autoLowGoalCount += autoLowGoal;
    result.teleopLowGoalCount += lowGoal;
    result.autoHighGoalCount += autoHighGoal;
    result.teleopHighGoalCount += highGoal;
    result.autoHighInnerGoalCount += autoHighInnerGoal;
    result.teleopHighInnerGoalCount += highInnerGoal;
    if (x[i].climbAttempted) {
      result.climbAttempts++;
    }
    if (x[i].climbSucceeded) {
      result.climbSuccesses++;
    }
    if (x[i].controlPanelRotationAttempted) {
      result.rotationAttempts++;
    }
    if (x[i].controlPanelRotationSucceeded) {
      result.rotationSuccesses++;
    }
    if (x[i].controlPanelPositionAttempted) {
      result.positionAttempts++;
    }
    if (x[i].controlPanelPositionSucceeded) {
      result.positionSuccesses++;
    }
    if (x[i].powerCellPickup != 0) {
      powerCellPickupRatings.push(x[i].powerCellPickup);
    }
    if (x[i].defenseCapability != 0) {
      drivetrainStrengthRatings.push(x[i].defenseCapability);
    }

    if (x[i].climbAttempted && x[i].climbSucceeded && x[i].climbBegin != null && x[i].climbEnd != null) {
      climbTimes.push(x[i].climbBegin - x[i].climbEnd);
    }

    if (x[i].controlPanelRotationAttempted && x[i].controlPanelRotationSucceeded && x[i].controlPanelRotationBegin != null && x[i].controlPanelRotationEnd != null) {
      rotationTimes.push(x[i].controlPanelRotationBegin - x[i].controlPanelRotationEnd);
    }

    if (x[i].controlPanelPositionAttempted && x[i].controlPanelPositionSucceeded && x[i].controlPanelPositionBegin != null && x[i].controlPanelPositionEnd != null) {
      positionTimes.push(x[i].controlPanelPositionBegin - x[i].controlPanelPositionEnd);
    }

    if ((x[i].liftedSomeone && x[i].lifted.length > 0) && x[i].liftedSomeone) {
      result.liftCount += x[i].lifted.length;
    }
  }

  //Most assignments will occur here.
  if (result.matchesPlayed == 0) {
    result.avgGamepieceCount = 0;
    result.avgGamepieceScore = 0;
    result.avgGamepieceAutoCount = 0;
    result.avgLowGoalCount = 0;
    result.avgHighGoalCount = 0;
    result.avgHighInnerGoalCount = 0;
    result.avgTotalScore = 0;
    result.gamepiecePickup = {
      numeric: 0,
      name: "N/A"
    };
    result.drivetrainStrength = {
      numeric: 0,
      name: "N/A"
    };
  } else {

    let gamepieceScoreSum = calculateScore(
      result.autoLowGoalCount,
      result.autoHighGoalCount,
      result.autoHighInnerGoalCount,
      result.teleopLowGoalCount,
      result.teleopHighGoalCount,
      result.teleopHighInnerGoalCount)

    result.avgGamepieceScore = gamepieceScoreSum / result.matchesPlayed;

    result.avgGamepieceCount = (
      result.autoLowGoalCount +
      result.autoHighGoalCount +
      result.autoHighInnerGoalCount +
      result.teleopLowGoalCount +
      result.teleopHighGoalCount +
      result.teleopHighInnerGoalCount) / result.matchesPlayed;

    result.avgGamepieceAutoCount = (
      result.autoLowGoalCount +
      result.autoHighGoalCount +
      result.autoHighInnerGoalCount) / result.matchesPlayed;

    result.avgLowGoalCount = (result.autoLowGoalCount + result.teleopLowGoalCount) / result.matchesPlayed;
    result.avgHighGoalCount = (result.autoHighGoalCount + result.teleopHighGoalCount) / result.matchesPlayed;
    result.avgHighInnerGoalCount = (result.autoHighInnerGoalCount + result.teleopHighInnerGoalCount) / result.matchesPlayed;

    result.avgTotalScore = (
        gamepieceScoreSum + 
        result.climbSuccesses * 25 + 
        result.rotationSuccesses * 10 + 
        result.positionSuccesses * 20 + 
        result.crossedLineCount * 5) / result.matchesPlayed;

    function sanityCheck(prop) {
      if (isNaN(result[prop])) {
        result[prop] = 0;
      }
    }

    sanityCheck('avgTotalScore');
    sanityCheck('maxTotalScore');
    sanityCheck('avgGamepieceCount');
    sanityCheck('maxGamepieceCount');
    sanityCheck('avgGamepieceAutoCount');
    sanityCheck('maxGamepieceAutoCount');
    sanityCheck('avgLowGoalCount');
    sanityCheck('maxLowGoalCount');
    sanityCheck('avgHighGoalCount');
    sanityCheck('maxHighGoalCount');
    sanityCheck('avgHighInnerGoalCount');
    sanityCheck('maxHighInnerGoalCount');
  }

  function calculateAvgTimes(times: number[], prop) {
    if (times.length > 0) {
      result[prop] = 0;
      for (var i = 0; i < times.length; i++) {
        result[prop] += times[i];
      }
      result[prop] = result[prop] / times.length;
    }
  }

  calculateAvgTimes(climbTimes, 'avgClimbTime');
  calculateAvgTimes(rotationTimes, 'rotationAvgTime');
  calculateAvgTimes(positionTimes, 'positionAvgTime');

  result.drivetrainStrength = calculateAvgQualitative(drivetrainStrengthRatings);
  result.gamepiecePickup = calculateAvgQualitative(powerCellPickupRatings);

  result.teamName = team.teamName;
  result.teamNumber = team.teamNumber;

  return result;
}

function calculateScore(autoLow: number, autoHigh: number, autoInnerHigh: number, teleopLow: number, teleopHigh: number, teleopInnerHigh: number): number {
  return (
    autoLow * 2 +
    autoHigh * 4 +
    autoInnerHigh * 6 +
    teleopLow * 1 +
    teleopHigh * 2 +
    teleopInnerHigh * 3);
}

function calculateAvgQualitative(ratings: QualitativeNumeric[]): QualitativeAnswer {
  let sum = ratings.reduce((a, b) => a + b, 0);
  let count = ratings.length;
  let hatchPickup = count == 0 ? 0 : sum / count;
  if (hatchPickup > 0 && hatchPickup <= 15) {
    return {
      numeric: 10,
      name: "Poor"
    };
  } else if (hatchPickup > 15 && hatchPickup <= 25) {
    return {
      numeric: 20,
      name: "Decent"
    };
  } else if (hatchPickup > 25 && hatchPickup <= 35) {
    return {
      numeric: 30,
      name: "Good"
    };
  } else if (hatchPickup > 35) {
    return {
      numeric: 40,
      name: "Excellent"
    };
  } else if (hatchPickup == 0) {
    return {
      numeric: 0,
      name: "N/A"
    };
  } else {
    console.info("invalid: ", hatchPickup);
    return {
      numeric: 0,
      name: "INVALID"
    };
  }
}
