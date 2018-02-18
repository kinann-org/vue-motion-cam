#/bin/bash
TMPDIR=`mktemp -d`

DIR="."
OUT="$TMPDIR/timelapse.mp4"
VERBOSE=0
FPS=40
SIZE='640x480'
while [ "$1" != "" ]; do
    PARAM="$1"
    case $PARAM in
        -o)
            OUT=$2
            shift 2
            ;;
        -v) 
            VERBOSE=1
            shift 1
            ;;
        -f)
            FPS=$2
            shift 2
            ;;
        -s)
            SIZE=$2
            shift 2
            ;;
        -d)
            DIR=$2
            shift 2
            ;;
        *)
            break
            ;;
    esac
done

START=$1 #inclusive
END=$2 #exclusive

for i in $( ls $DIR ); do
    if [[ "$START" && "$i" < "$START" ]]; then
        if [ "$VERBOSE" = "1" ]; then sleep 0; fi # dummy
    elif [[ "$END" != "" && "$END" < "$i" ]]; then
        if [ "$VERBOSE" = "1" ]; then sleep 0; fi # dummy
    else
        if [ "$VERBOSE" = "1" ]; then echo -e "image\t: $i"; fi
        ln -s `realpath "$DIR/$i"` "$TMPDIR/$i"
        RC=$?; if [ "$RC" != "0" ]; then exit $RC; fi
    fi
done

if [ "$VERBOSE" = "1" ]; then echo -e "OUT\t: $OUT"; fi
if [ "$VERBOSE" = "1" ]; then echo -e "DIR\t: $DIR"; fi
if [ "$VERBOSE" = "1" ]; then echo -e "START\t: $START"; fi
if [ "$VERBOSE" = "1" ]; then echo -e "END\t: $END"; fi
if [ "$VERBOSE" = "1" ]; then echo -e "SIZE\t: $SIZE"; fi
if [ "$VERBOSE" = "1" ]; then echo -e "FPS\t: $FPS"; fi

cd $TMPDIR
ffmpeg -y -r $FPS -f image2 -s $SIZE -pattern_type glob -i "*.jpg" -vcodec libx264 -crf 25  -pix_fmt yuv420p "$OUT"
RC=$?; if [ "$RC" != "0" ]; then exit $RC; fi
echo $OUT
exit 0