#GPIO49 as BOOT PIN
#GPIO66 as NRST PIN
#GPIO48 as INPUT PIN
#GPIO67 as OUTPUT PIN
#GPIO30 as INPUT PIN
#GPIO86 as OUTPUT PIN

echo 49 > /sys/class/gpio/export
echo 66 > /sys/class/gpio/export
#echo 30 > /sys/class/gpio/export
#echo 48 > /sys/class/gpio/export
echo 67 > /sys/class/gpio/export
echo 86 > /sys/class/gpio/export

echo out > /sys/class/gpio/gpio49/direction
echo out > /sys/class/gpio/gpio86/direction
#echo out > /sys/class/gpio/gpio66/direction
#echo out > /sys/class/gpio/gpio67/direction

#Stop empty effect
echo 1 > /sys/class/gpio/gpio67/value
sleep 0.1
echo 0 > /sys/class/gpio/gpio67/value
i2cset -y 2 0x68 0x00 0x32 0x39 i

#Take a relax
sleep 2.5

#Colorwheel on Led ring
echo 1 > /sys/class/gpio/gpio67/value
sleep 0.1
echo 0 > /sys/class/gpio/gpio67/value
i2cset -y 2 0x68 0x00 0x35 0x38 i

#Set DNS
echo 'nameserver 8.8.8.8' > /etc/resolv.conf