import numpy as np
import cv2
import sys
import json
import os

info = json.loads(sys.argv[1])

if not os.path.exists(info['path']):
  raise ValueError('Path does not exist ' + info['path'])


img = cv2.imread(info['path'])

mask = np.zeros(img.shape[:2],np.uint8)


for point in info['foreground']: mask[point[1]][point[0]] = 1
for point in info['background']: mask[point[1]][point[0]] = 0


bgdModel = np.zeros((1,65),np.float64)
fgdModel = np.zeros((1,65),np.float64)


rect = tuple(info['rectangle'])

mask, bgdModel, fgdModel = cv2.grabCut(img,mask,rect,bgdModel,fgdModel,1,cv2.GC_INIT_WITH_RECT)

mask2 = np.where((mask==2)|(mask==0),0,255).astype('uint8')

#img = img*mask2[:,:,np.newaxis]

cv2.imwrite(info['path']+'-mask.png', mask2)

im2, contours, hierarchy = cv2.findContours(mask2,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_SIMPLE)


print json.dumps([[point[0].tolist() for point in contour] for contour in contours])
