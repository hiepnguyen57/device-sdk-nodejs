#!/bin/bash
###############################################
# Software Reset
###############################################
#
# Select Page 0
i2cset -y -f 1 0x18 0x00 0x00
#
# Initialize the device through software reset
i2cset -y -f 1 0x18 0x01 0x01
#

###############################################
# Clock Settings
# ---------------------------------------------
# The codec receives: MCLK = 24 MHz,
# BLCK = 1,4112 MHz, WCLK = 44,1 kHz
###############################################
#
# Select Page 0
i2cset -y -f 1 0x18 0x00 0x00
#
# MCLK as PLL_input; PLL_CLK as CODEC_CLKIN
i2cset -y -f 1 0x18 0x04 0x03
#
# P = 2; R = 1; J = 7; D = 0560; PLL enabled
i2cset -y -f 1 0x18 0x05 0xa1
i2cset -y -f 1 0x18 0x06 0x07
i2cset -y -f 1 0x18 0x07 0x02
i2cset -y -f 1 0x18 0x08 0x30
#
# NDAC = 5, MDAC = 3; dividers powered on
i2cset -y -f 1 0x18 0x0b 0x85
i2cset -y -f 1 0x18 0x0c 0x83
#
# Program the OSR of DAC to 128
i2cset -y -f 1 0x18 0x0d 0x00
i2cset -y -f 1 0x18 0x0e 0x80
#
# NADC = 5, MADC = 3; dividers powered off
i2cset -y -f 1 0x18 0x12 0x05
i2cset -y -f 1 0x18 0x13 0x03
#

###############################################
# Signal Processing Settings
###############################################
#
# Select Page 0
i2cset -y -f 1 0x18 0x00 0x00
#
# Set serial interface at I2S and 16-bit
i2cset -y -f 1 0x18 0x1b 0x00
#
# Set the DAC Mode to PRB_P8
i2cset -y -f 1 0x18 0x3c 0x08

###############################################
# Initialize Codec
###############################################
#
# Select Page 1
i2cset -y -f 1 0x18 0x00 0x01
#
# Enable weak AVDD in presence of external
# AVDD supply
i2cset -y -f 1 0x18 0x01 0x00
#
# Enable Master Analog Power Control
i2cset -y -f 1 0x18 0x02 0x00
#
#
# Set the REF charging time to 40ms
i2cset -y -f 1 0x18 0x7b 0x01

###############################################
# Playback Setup
###############################################
#
# Select Page 1
i2cset -y -f 1 0x18 0x00 0x01
#
# De-pop
i2cset -y -f 1 0x18 0x14 0x25
#
# Set the Input Common Mode to 0.9V and Output Common Mode for Headphone to
# Input Common Mode
i2cset -y -f 1 0x18 0x0a 0x00
#
# Route LDAC/RDAC to LOL/LOR
i2cset -y -f 1 0x18 0x0e 0x08
i2cset -y -f 1 0x18 0x0f 0x08
#
# Unmute LOL/LOR driver, 0db Gain
i2cset -y -f 1 0x18 0x12 0x00
i2cset -y -f 1 0x18 0x13 0x00
#
# Power up LOL/LOR
i2cset -y -f 1 0x18 0x09 0x0c
#
# Select Page 0
i2cset -y -f 1 0x18 0x00 0x00
#
# Set DOUT as INT1
#i2cset -y -f 1 0x18 0x35 0x08
#
# Set INT1 Interrupt for Headset Insertion Event
#i2cset -y -f 1 0x18 0x30 0x80
#
# Headset Detection Enabled
#i2cset -y -f 1 0x18 0x43 0x80

#
# DAC => 0dB
i2cset -y -f 1 0x18 0x41 0x00
i2cset -y -f 1 0x18 0x42 0x00
#
# Power up LDAC/RDAC
i2cset -y -f 1 0x18 0x3f 0xd4
#
# Unmute LDAC/RDAC
i2cset -y -f 1 0x18 0x40 0x00
#

sleep 0.2
#set PCM as 50%
amixer sset PCM 50%
