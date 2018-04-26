#!/bin/bash

OUT=~/Downloads/snapmp4-test.mp4
SCRIPTDIR=`dirname $0`
DIR="$SCRIPTDIR/../test/CAM1"

$SCRIPTDIR/snapmp4.sh -o $OUT -f 30 -s '640x480' -d $DIR
