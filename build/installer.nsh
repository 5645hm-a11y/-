; installer.nsh — custom hooks for magic-print NSIS installer
;
; Problem: magic-print minimises to the system tray instead of closing when
; Windows sends WM_CLOSE.  The NSIS installer cannot proceed because it sees
; the process as still running and shows "cannot be closed" to the user.
;
; Fix: kill the process BEFORE files are copied (customInit) so there are no
; file-lock errors, and again at the end (customInstall) as a safety net.

; Runs BEFORE any files are extracted — prevents locked-file errors
!macro customInit
  nsExec::ExecToLog '"$SYSDIR\taskkill.exe" /IM "magic-print.exe" /T'
  Sleep 1500
  nsExec::ExecToLog '"$SYSDIR\taskkill.exe" /F /IM "magic-print.exe" /T'
  Sleep 1000
!macroend

; Runs after files are installed — safety net
!macro customInstall
  nsExec::ExecToLog '"$SYSDIR\taskkill.exe" /F /IM "magic-print.exe" /T'
  Sleep 500
!macroend

; Runs before files are removed during uninstall
!macro customUnInstall
  nsExec::ExecToLog '"$SYSDIR\taskkill.exe" /IM "magic-print.exe" /T'
  Sleep 1500
  nsExec::ExecToLog '"$SYSDIR\taskkill.exe" /F /IM "magic-print.exe" /T'
  Sleep 500
!macroend
