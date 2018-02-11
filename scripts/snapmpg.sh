#/bin/bash
START=$1
END=$2
RES=$3
for i in $( ls ); do
    if [[ "$i" < "$START" ]]; then
        echo -e "before $START\t: $i"
    elif [[ "$END" < "$i" ]]; then
        echo -e "after $END\t: $i"
    else
        echo -e "item\t: $i"
    fi
done

#ffmpeg -r 40 -f image2 -s 848x480 -pattern_type glob -i 'CAM*.jpg' -vcodec libx264 -crf 25  -pix_fmt yuv420p test.mp4

