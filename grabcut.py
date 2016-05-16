import numpy as np
import cv2
import sys
import json
import os
import base64


typeToGC_MASK = {
  'probable_foreground' : cv2.GC_PR_FGD,
  'foreground' : cv2.GC_FGD,
  'background' : cv2.GC_BGD
}

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

scale = info['scale']

# create empty mask and scale it for image dimensions
mask = np.empty((int(img.shape[0]/scale),int(img.shape[1]/scale)),np.uint8)

# fill with background
mask.fill(cv2.GC_PR_BGD)

# fill parts appropriately
for mark in info['marks']:
  mask = cv2.polylines(mask,
    [np.array(mark['path'], np.int32).reshape((-1,1,2))],
    False,
    typeToGC_MASK[mark['type']],
    thickness=mark['radius']*2)

# resize the mask to fit compressed image dimensions
mask = cv2.resize(mask, (img.shape[1], img.shape[0]), interpolation=cv2.INTER_NEAREST)

bgdModel = np.zeros((1,65),np.float64)
fgdModel = np.zeros((1,65),np.float64)

mask, bgdModel, fgdModel = cv2.grabCut(img,mask,None,bgdModel,fgdModel,5,cv2.GC_INIT_WITH_MASK)

# create the alpha channel
img_a = np.where((mask==2)|(mask==0),0,255).astype('uint8')

# find contours
contour_img, contours, heirarchy = cv2.findContours(img_a.copy(),cv2.RETR_TREE,cv2.CHAIN_APPROX_SIMPLE)

#scale contours and flatten array since points are [[point]]
# add .5 to be in center of edge pixel
# can dilate img_a by 1 to account for cutting into image
halfPixel = 0.5/scale
contours = [[tuple(point[0]+halfPixel) for point in contour/scale] for contour in contours]

#img_a_blur = cv2.GaussianBlur(img_a, (3,3),3)
#img_a_blur = cv2.medianBlur(img_a_blur, 11)
#img_a_edge = cv2.Canny(img_a, 0,254)
#img_a = np.where((img_a>0)&(img_a_edge==0),img_a,img_a_blur)

##### not writing actual image
#img_b, img_g, img_r = cv2.split(img);
#img_rgba = cv2.merge((img_b*mask, img_g*mask, img_r*mask, img_a))
#### write the transparency image (resize for smooth masking)
#cv2.imwrite(info['path'] + '-grabcut.png', img_rgba);
# cv2.imwrite(info['path'] + '-grabcut-mask.png', mask_rgba);

#scale image a to fit
img_a = cv2.GaussianBlur(img_a, (11,11),11)
img_a = cv2.resize(img_a, (info['width'], info['height']))
ret, img_a = cv2.threshold(img_a,127,255,cv2.THRESH_BINARY)
cv2.imwrite(info['path'] + '-grabcut-mask.png', img_a);

##########################################
# to return base64 version of image mask
#  get image with transparency channel
#mask_rgba = cv2.merge((img_a, img_a, img_a, img_a))
#print base64.b64encode(open(info['path'] + '-grabcut-mask.png', "rb").read())
##########################################


# to return JSON of contour information
print json.dumps({
  "vector" : contours,
  "raster" : "data:image/png;base64," + base64.b64encode(open(info['path'] + '-grabcut-mask.png', "rb").read())
})
