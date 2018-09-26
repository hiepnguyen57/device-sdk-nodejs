#GPIO61 as BOOT PIN
#GPIO66 as NRST PIN
#GPIO48 as INPUT PIN
#GPIO67 as OUTPUT PIN
echo 61 > /sys/class/gpio/export
echo 66 > /sys/class/gpio/export
#echo 48 > /sys/class/gpio/export
echo 67 > /sys/class/gpio/export

echo out > /sys/class/gpio/gpio61/direction
echo 0 > /sys/class/gpio/gpio61/value

echo out > /sys/class/gpio/gpio66/direction
echo 1 > /sys/class/gpio/gpio66/value

echo out > /sys/class/gpio/gpio67/direction
echo 1 > /sys/class/gpio/gpio67/value

#Colorwheel on Led ring
sleep 2
echo 0 > /sys/class/gpio/gpio67/value
i2cset -y -f 1 0x68 0x00 0x35 0x38 i