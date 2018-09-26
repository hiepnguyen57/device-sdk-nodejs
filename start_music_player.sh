#stop colorwheel
echo 1 > /sys/class/gpio/gpio67/value
sleep 0.1
echo 0 > /sys/class/gpio/gpio67/value
i2cset -y -f 1 0x68 0x00 0x35 0x39 i

#start dimming
echo 1 > /sys/class/gpio/gpio67/value
sleep 0.1
echo 0 > /sys/class/gpio/gpio67/value
i2cset -y -f 1 0x68 0x00 0x30 0x38 i

#start music-player
/usr/bin/node /home/root/music-player/app.js