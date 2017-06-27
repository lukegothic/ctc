<?php
function getElapsedTime($date, $inms = false) {
	$elapsedSeconds = date_create()->getTimestamp() - date_create($date)->getTimestamp();
	return $elapsedSeconds * ($inms ? 1000 : 1);
}
?>
