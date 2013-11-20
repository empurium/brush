# brush

Brush is a handy script to help you organize your pictures into a directory structure
that is suitable for permanent storage, and ultimately very future-proof.

The idea is that you use a program such as Google Picasa to import your pictures from
your phone(s), camera(s), video camera(s), etc. Typically the fastest way to
import pictures with these types of programs is to just click "Import" and let the
program put them all into one directory (or breka them up in 2 hour timespans like
iPhoto does). After they're all imported, you'll go through and sort the pictures
appropriately into "Events". This process is most convenient within a GUI. Afterward,
you Brush your photo Events into a permanent storage.

## tl;dr how do I use it?

```
cd Pictures/Imported/
node brush.js
```

## Why?

Google Picasa likes to just dump all of your Events into a flat directory upon
importing them, eventually leaving you with tens of thousands of events in one place.
iPhoto likes to just throw them into a single directory named by the date in which
you imported them, and save XML data once you've done your organization.

Both of these methods are a bit flawed if you prefer a raw filesystem structure so
that you have more flexibility with what you can do with your photos in the future.

## This structure

* Imported Pictures/
	* Surfing In Hawaii/
	* Luau On The Beach/
	* Camping At Panguitch Lake/
	* Formula Drift at the Las Vegas Speedway/

## Becomes this structure

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

## How?

You unleash the Brush unto a directory (see below). It will look at each Event,
scan the EXIF data on each picture within that Event (as well as file timestamps).
Once the Brush determines the start / end date of each Event, it will create the
appropriate directory within your Sorted Pictures and move the pictures into it.

Brush uses the earliest date on any given Event photo/video as the assumed date
of that Event. So if you start taking pictures on April 30th at 2pm for your
birthday, but you rage until 4am on May 1st - your pictures will end up being
sorted to the month of your birthday.


## To do

* Have EXIF take precedence when determining file dates
* Test everything when running with EXIF dates
* Clean up output
