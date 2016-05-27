import numpy as np
import cv2
import sys
import json
import os
import base64

info = json.loads(sys.argv[1])

img = cv2.imread(info['filepath'])
cutout_filepath = info['cutoutFilepath']

#    create mask of img size
mask = np.empty(img.shape,np.uint8)
mask.fill(0)

#    draw mask polygons on mask
mask_paths = [np.array(path, dtype=np.int32) for path in info['maskPaths']]
cv2.fillPoly(mask, mask_paths, (1,)*img.shape[2])

# apply the mask
masked_image = img*mask

# TODO: ensure alpha channel

# save the result
cv2.imwrite(cutout_filepath, masked_image)
