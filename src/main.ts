// we want font-awesome to load as soon as possible to show the fa-spinner
import {Aurelia} from 'aurelia-framework'
import environment from './environment';
import {PLATFORM} from 'aurelia-pal';
import * as Bluebird from 'bluebird';

export function configureWazzis(aurelia: Aurelia) {
  let xx = aurelia.use
    .standardConfiguration()
    .feature(PLATFORM.moduleName('resources/index'))
    .feature(PLATFORM.moduleName('games/powerup/index'))
    //.feature(PLATFORM.moduleName('games/powerupv2/index'))
    .feature(PLATFORM.moduleName('games/deepspace/index'))
    .feature(PLATFORM.moduleName('games/recharge/index'))
    .plugin(PLATFORM.moduleName('aurelia-bootstrap'), config => config.options.version = 4)
    .plugin(PLATFORM.moduleName('aurelia-validation'))
    .plugin(PLATFORM.moduleName('aurelia-dialog'))
    .globalResources(PLATFORM.moduleName("resources/value-converters/numeric-value-converter"));

  // Uncomment the line below to enable animation.
  // aurelia.use.plugin(PLATFORM.moduleName('aurelia-animator-css'));
  // if the css animator is enabled, add swap-order="after" to all router-view elements

  if (environment.debug) {
    xx = aurelia.use.developmentLogging();
  }

  if (environment.testing) {
    xx = aurelia.use.plugin(PLATFORM.moduleName('aurelia-testing'));
  }
  return xx;

}
export function configure(aurelia: Aurelia) {
  configureWazzis(aurelia);

  aurelia.start().then(() => aurelia.setRoot(PLATFORM.moduleName('app')));
}
