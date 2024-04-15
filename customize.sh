##########################################################################################
#
# Magisk Module Installer Script
#
##########################################################################################

# skip all default installation steps
SKIPUNZIP=0

# Set what you want to display when installing your module

print_modname() {
  ui_print " "
  ui_print "*******************************"
  ui_print " Supports Android7-14 move cert"
  ui_print "*******************************"
  ui_print " "
}

# Copy/extract your module files into $MODDIR in on_install.

on_install() {

  # F_TARGETDIR="$MODDIR/system/etc/security/cacerts/"
  D_CERTIFICATE="$MODPATH/certificates"

  # mkdir -p "$F_TARGETDIR"
  # create temp cert
  D_TMP_CERT=/data/local/tmp/cert

  if [ -f "$D_TMP_CERT" ]; then
    ui_print "- ${D_TMP_CERT} found"
  else
    ui_print "- create ${D_TMP_CERT}"
    mkdir -p -m 777 "$D_TMP_CERT"
  fi
  # ui_print "- mkdir $MODPATH/certificates"
  mkdir -p -m 755 "$D_CERTIFICATE"
  mkdir -p -m 755 /data/misc/user/0/cacerts-added
}

# You can add more functions to assist your custom script code
print_modname
on_install
