import numpy as np
import cv2
import sys
import json
import os

# returns iterable of (a,b) pairs
# where a is current element and b is the next in the given iterable
def pairwise(iterable):
  it = iter(iterable)
  a = next(it)

  for b in it:
    yield (a, b)
    a = b


info = json.loads(sys.argv[1])

if not os.path.exists(info['path']):
  raise ValueError('Path does not exist ' + info['path'])


img = cv2.imread(info['path'])


mask = np.empty(img.shape[:2],np.uint8)
# fill with background
mask.fill(cv2.GC_PR_BGD)


typeToGC_MASK = {
  'probable_foreground' : cv2.GC_PR_FGD,
  'foreground' : cv2.GC_FGD,
  'background' : cv2.GC_BGD
}

# fill parts appropriately
for mark in info['marks']:
  mask = cv2.polylines(mask,
    [np.array(mark['path'], np.int32).reshape((-1,1,2))],
    False,
    typeToGC_MASK[mark['type']],
    thickness=mark['radius'])



bgdModel = np.zeros((1,65),np.float64)
fgdModel = np.zeros((1,65),np.float64)

mask, bgdModel, fgdModel = cv2.grabCut(img,mask,None,bgdModel,fgdModel,2,cv2.GC_INIT_WITH_MASK)


mask2 = np.where((mask==2)|(mask==0),0,255).astype('uint8')

#img = img*mask2[:,:,np.newaxis]

#cv2.imwrite(info['path']+'-mask.png', mask2)

im2, contours, hierarchy = cv2.findContours(mask2,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_SIMPLE)


print json.dumps([[point[0].tolist() for point in contour] for contour in contours])
