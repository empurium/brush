## brush

Brush is a handy script to help you organize your pictures into a directory structure
that is more suitable for permanent storage. It will also save the events that it
finds in MongoDB for your own usage, such as a web gallery.

For example, it will scan through a directory of "Events", read the EXIF data (or fall
back to file time stamps) to determine the Start and End times of an event, then place
them into a directory structure which includes the date:

# This structure
* Imported Pictures/
	* Surfing In Hawaii/
	* Luau On The Beach/
	* Camping At Panguitch Lake/
	* Formula Drift at the Las Vegas Speedway/

# Becomes this structure
* Sorted Pictures/
	* 2012/
		* 05/
			* Surfing In Hawaii/
			* Luau On The Beach/
	* 2012/
		* 07/
			* Camping At Panguitch Lake/
	* 2013/
		* 04/
			* Formula Drift at the Las Vegas Speedway/


## Google Picasa

Google's Picasa is a great program for importing pictures on your camera. Once you import
your pictures from your camera, Picasa makes it very easy to select several images,
right-click and select "Move to New Folder...".

From there, you can simply give it a new Event name. However, it likes to keep all pictures
in one very large directory. I prefer having them organized by month of the event, which
is why I put together Picasa's brush.


## To do

* Have EXIF take precedence when determining file dates
* Test everything when running with EXIF dates
* Search for overlapping events, warn if any are found
* Parse Picasa.ini, note hidden / starred files in MongoDB
* 
* Clean up output
