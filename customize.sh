#
# This file is part of iyue.
#
# iyue is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
#
# iyue is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with iyue.  If not, see <https://www.gnu.org/licenses/>.
#
# Copyright (C) 2021 iyue Contributors
#


init_install(){
  # ui_print "*******************************"
  # ui_print "        Move Certificates      "
  # ui_print "        by iyue                "
  # ui_print "*******************************"
  ui_print "delete Placeholder file"
  rm $MODPATH/system/etc/security/cacerts/placeholder
}

# Output installation information
init_install