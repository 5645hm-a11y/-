; installer.nsh — custom hooks for magic-print NSIS installer
;
; Problem: magic-print minimises to the system tray instead of closing when
; Windows sends WM_CLOSE.  The NSIS installer cannot proceed because it sees
; the process as still running and shows "cannot be closed" to the user.
;
; Fix: before installing (or uninstalling) we kill the running process with
; taskkill so the installer can overwrite the files freely.

!macro customInstall
  ; 1. Graceful request — sends SIGTERM / WM_CLOSE
  ExecWait '"taskkill" /IM "magic-print.exe" /T'
  Sleep 1500
  ; 2. Force-kill whatever is still alive (handles the tray-hide case)
  ExecWait '"taskkill" /F /IM "magic-print.exe" /T'
  Sleep 500
!macroend

!macro customUnInstall
  ExecWait '"taskkill" /IM "magic-print.exe" /T'
  Sleep 1500
  ExecWait '"taskkill" /F /IM "magic-print.exe" /T'
  Sleep 500
!macroend
