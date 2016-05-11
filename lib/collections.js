Images = new FS.Collection("images", {
  stores: [new FS.Store.FileSystem("images", {path: "~/uploads"})]
});

Photograbs = new Meteor.Collection("photograbs");
Marks = new Meteor.Collection("marks");
Masks = new Meteor.Collection("masks");
