Set WshShell = CreateObject("WScript.Shell")
WshShell.Run "powershell.exe -ExecutionPolicy Bypass -File d:\projects\GATERevisionTrackerWebsite\launch.ps1", 0, False
