smoothCutout = function (data, threshold) {
  var smoothed = [];
  data.forEach(function (path) {
    //  smooth the path
    path = dejag(path, threshold);
    path = simplify(path, threshold, true);
    //  end on the first
    path.push(path[0]);
    smoothed.push(path);
  });
  return smoothed;
}
