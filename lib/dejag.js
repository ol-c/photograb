dejag = function (path, tolerance) {
  tolerance = tolerance | 1;
  //  if 2 points are close enough, replace them with their average
  function dist2(p1,p2) {
    return Math.pow(p1[0]-p2[0], 2) + Math.pow(p1[1]-p2[1], 2);
  }

  function averagePt(p1,p2) {
    return [(p1[0]+p2[0])/2, (p1[1]+p2[1])/2];
  }

  //  use copy
  path = path.concat([]);

  var dejagged = [];

  var tolerance2 = tolerance*tolerance;
  while (path.length) {
    if (path[1] && dist2(path[0], path[1]) < tolerance2) {
      path[1] = averagePt(path[0], path[1]);
      path.shift();
    }
    dejagged.push(path.shift());
  }

  return dejagged;
}
