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
    thickness=mark['radius']*2)



bgdModel = np.zeros((1,65),np.float64)
fgdModel = np.zeros((1,65),np.float64)

mask, bgdModel, fgdModel = cv2.grabCut(img,mask,None,bgdModel,fgdModel,5,cv2.GC_INIT_WITH_MASK)

# create the alpha channel
mask = np.where((mask==2)|(mask==0),0,1).astype('uint8');
img_a = np.where((mask==0),0,255).astype('uint8')
img_a = cv2.blur(img_a, (3,3))

#  clamp transparent values
img_a = np.where((img_a<64),0,img_a).astype('uint8')
img_a = np.where((img_a>127),255,img_a).astype('uint8')


img_b, img_g, img_r = cv2.split(img);
img_rgba = cv2.merge((img_b*mask, img_g*mask, img_r*mask, img_a))

cv2.imwrite(info['path'] + '-grabcut.png', img_rgba);
cv2.imwrite(info['path'] + '-grabcut-mask.png', img_a);
