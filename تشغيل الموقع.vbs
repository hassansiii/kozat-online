Set fso = CreateObject("Scripting.FileSystemObject")
Set sh = CreateObject("WScript.Shell")

projectDir = fso.GetParentFolderName(WScript.ScriptFullName)
sh.CurrentDirectory = projectDir

If Not fso.FolderExists(projectDir & "\node_modules") Then
  sh.Run "cmd /c cd /d """ & projectDir & """ && npm install", 0, True
End If

' تشغيل PostgreSQL عبر Docker إن وُجد
sh.Run "cmd /c cd /d """ & projectDir & """ && docker compose up -d", 0, True

' مزامنة القاعدة ثم تشغيل السيرفر
sh.Run "cmd /c cd /d """ & projectDir & """ && npx prisma db push && npm run dev", 0, False

WScript.Sleep 12000
sh.Run "http://localhost:3000", 1, False
