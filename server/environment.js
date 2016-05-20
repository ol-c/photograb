//  set environment variables according to settings
Meteor.startup(function () {
  for (var variable in Meteor.settings.env) {
    process.env[variable] = Meteor.settings.env[variable];
  }
});
