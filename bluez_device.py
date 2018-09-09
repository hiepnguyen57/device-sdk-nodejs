import dbus
import dbus.service
import bluezutils
import dbus.mainloop.glib

_device_object_path = None

def set_device_object_path(new_device_object_path):
	global _device_object_path
	_device_object_path = new_device_object_path

def get_device_object_path():
	global _device_object_path
	return _device_object_path

def get_device_mac(path):
	props = dbus.Interface(bus.get_object("org.bluez", path), "org.freedesktop.DBus.Properties")
	mac_addr = props.Get("org.bluez.Device1", "Address")
	return mac_addr

def get_device_uuid(path):
	bus = dbus.SystemBus()
	props = dbus.Interface(bus.get_object("org.bluez", path),"org.freedesktop.DBus.Properties")
	UUIDs =  props.Get("org.bluez.Device1", "UUIDs")
	return UUIDs

def get_device(path):
	bus = dbus.SystemBus()
	device = dbus.Interface(bus.get_object('org.bluez', path), dbus_interface='org.bluez.Device1')
	return device

def get_device_name(path):
	bus = dbus.SystemBus()
	props = dbus.Interface(bus.get_object("org.bluez", path),"org.freedesktop.DBus.Properties")
	Name =  props.Get("org.bluez.Device1", "Name")
	return Name

def get_mac_address(path):
	bus = dbus.SystemBus()
	props = dbus.Interface(bus.get_object("org.bluez", path),"org.freedesktop.DBus.Properties")
	Address =  props.Get("org.bluez.Device1", "Address")
	return Address
if __name__ == '__main__':
	print get_device_name('/org/bluez/hci0/dev_10_41_7F_35_71_9A')
