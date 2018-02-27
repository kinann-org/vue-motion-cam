<code>&lt;vue-motion-cam&gt;</code> is a Vue/Vuetify RestBundle for motion capture from one or more USB cameras.

* **settings dialog** lets user update and save individual camera settings such as <var>framesize</var>
* **auto-device recognition** pairs active USB video devices with new/existing camera settings.
* **vuex store** shares camera state and configuration.
* **auto-generates motion configuration files** from JSON camera settings saved on hosting server.
* **weekly/monthly timelapse movies** movies generated on demand from web page.

### Installation
```bash
sudo apt-get install v4l-utils  # Command line utilities for Video4Linux version 2 video library
sudo apt-get install motion # Linux motion capture library for Video4Linux
git clone https://github.com/kinann-org/vue-motion-cam.git  
cd vue-motion-cam
npm install
```

### Demo
```bash
npm run dev
```

http://localhost:4000/

<a href="https://raw.githubusercontent.com/kinann-org/vue-motion-cam/master/doc/img/vmc.png"><img
    src="https://raw.githubusercontent.com/kinann-org/vue-motion-cam/master/doc/img/vmc.png" height=200px></a>

