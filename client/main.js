//  initialize the photograb
var BRUSH_SIZE = 64;
var photograbId = new ReactiveVar();

Meteor.call('initializePhotograb', function (error, id) {
  Meteor.subscribe('photograbs', id);
  Meteor.subscribe('marks', id);
  photograbId.set(id);
});

Template.registerHelper('equals', function (a, b) {
  return a == b;
});

Template.registerHelper('currentPhotograb', function () {
  return Photograbs.findOne(photograbId.get());
});
