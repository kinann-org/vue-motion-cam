(function(exports) {
    const props3_2 = {
        // See http://htmlpreview.github.io/?https://github.com/Motion-Project/motion/blob/master/motion_guide.html
        area_detect: "area_detect",
        auto_brightness: "auto_brightness",
        brightness: "brightness",
        camera: "thread",
        camera_dir: "# camera_dir",
        camera_id: "# camera_id",
        camera_name: "# camera_name:",
        contrast: "contrast",
        daemon: "daemon",
        database_busy_timeout: "# database_busy_timeout:",
        database_dbname: "mysql_db",
        database_dbname: "pgsql_db",
        database_host: "mysql_host",
        database_host: "pgsql_host",
        database_password: "mysql_password",
        database_password: "pgsql_password",
        database_port: "pgsql_port",
        database_type: "# database_type:",
        database_user: "mysql_user",
        database_user: "pgsql_user",
        despeckle_filter: "despeckle",
        emulate_motion: "output_all",
        event_gap: "gap",
        exif_text: "# exif_text:",
        extpipe: "# extpipe:",
        ffmpeg_bps: "ffmpeg_bps",
        ffmpeg_duplicate_frames: "# ffmpeg_duplicate_frames:",
        ffmpeg_output_debug_movies: "ffmpeg_cap_motion",
        ffmpeg_output_movies: "ffmpeg_cap_new",
        ffmpeg_timelapse: "ffmpeg_timelapse",
        ffmpeg_timelapse_mode: "ffmpeg_timelapse_mode",
        ffmpeg_variable_bitrate: "ffmpeg_variable_bitrate",
        ffmpeg_video_codec: "ffmpeg_video_codec",
        flip_axis: "flip_axis",
        framerate: "framerate",
        framesize: "# framesize",
        frequency: "frequency",
        height: "height",
        hue: "hue",
        input: "input",
        ipv6_enabled: "# ipv6_enabled:",
        lightswitch: "lightswitch",
        locate_motion_mode: "locate",
        locate_motion_style: "# locate_motion_style:",
        log_level: "# log_level:",
        log_type: "# log_type:",
        logfile: "# logfile:",
        mask_file: "mask_file",
        mask_privacy: "# mask_privacy:",
        max_movie_time: "max_mpeg_time",
        minimum_frame_time: "minimum_frame_time",
        minimum_motion_frames: "minimum_motion_frames",
        mmalcam_control_params: "# mmalcam_control_params:",
        mmalcam_name: "# mmalcam_name:",
        motion_video_pipe: "motion_video_pipe",
        movie_filename: "movie_filename",
        netcam_keepalive: "netcam_keepalive",
        netcam_proxy: "netcam_proxy",
        netcam_tolerant_check: "netcam_tolerant_check",
        netcam_url: "netcam_url",
        netcam_userpass: "netcam_userpass",
        noise_level: "noise_level",
        noise_tune: "noise_tune",
        norm: "norm",
        on_area_detected: "on_area_detected",
        on_camera_lost: "on_camera_lost",
        on_camera_found: "on_camera_found",
        on_event_end: "on_event_end",
        on_event_start: "on_event_start",
        on_motion_detected: "on_motion_detected",
        on_movie_end: "on_movie_end",
        on_movie_start: "on_movie_start",
        on_picture_save: "on_picture_save",
        output_debug_pictures: "output_normal",
        output_pictures: "output_motion",
        picture_filename: "jpeg_filename",
        picture_type: "ppm",
        post_capture: "post_capture",
        power_line_frequency: "# power_line_frequency:",
        pre_capture: "pre_capture",
        process_id_file: "process_id_file",
        quality: "quality",
        quiet: "quiet",
        rotate: "rotate",
        roundrobin_frames: "roundrobin_frames",
        roundrobin_skip: "roundrobin_skip",
        rtsp_uses_tcp: "# rtsp_uses_tcp:",
        saturation: "saturation",
        setup_mode: "setup_mode",
        smart_mask_speed: "smart_mask_speed",
        snapshot_filename: "snapshot_filename",
        snapshot_interval: "snapshot_interval",
        sql_log_movie: "sql_log_mpeg",
        sql_log_picture: "sql_log_image",
        sql_log_snapshot: "sql_log_snapshot",
        sql_log_timelapse: "sql_log_timelapse",
        sql_query: "sql_query",
        sql_query_start: "sql_query_start",
        stream_auth_method: "# stream_auth_method:",
        stream_authentication: "# stream_authentication:",
        stream_limit: "webcam_limit",
        stream_localhost: "webcam_localhost",
        stream_maxrate: "webcam_maxrate",
        stream_motion: "webcam_motion",
        stream_port: "webcam_port",
        stream_preview_newline: "# stream_preview_newline:",
        stream_preview_scale: "# stream_preview_scale:",
        stream_quality: "webcam_quality",
        switchfilter: "switchfilter",
        target_dir: "target_dir",
        text_changes: "text_changes",
        text_double: "text_double",
        text_event: "text_event",
        text_left: "text_left",
        text_right: "text_right",
        threshold: "threshold",
        threshold_tune: "threshold_tune",
        timelapse_filename: "timelapse_filename",
        track_auto: "track_auto",
        track_iomojo_id: "track_iomojo_id",
        track_maxx: "track_maxx",
        track_maxy: "track_maxy",
        track_motorx: "track_motorx",
        track_motory: "track_motory",
        track_move_wait: "track_move_wait",
        track_port: "track_port",
        track_speed: "track_speed",
        track_step_angle_x: "track_step_angle_x",
        track_step_angle_y: "track_step_angle_y",
        track_stepsize: "track_stepsize",
        track_type: "track_type",
        tunerdevice: "tunerdevice",
        use_extpipe: "# use_extpipe:",
        v4l2_palette: "v4l2_palette",
        video_pipe: "video_pipe",
        videodevice: "videodevice",
        webcontrol_authentication: "control_authentication",
        webcontrol_html_output: "control_html_output",
        webcontrol_localhost: "control_localhost",
        webcontrol_port: "control_port",
        width: "width",
    }

    module.exports = exports.MotionProps = {
        props3_2,
    }

})(typeof exports === "object" ? exports : (exports = {}));
