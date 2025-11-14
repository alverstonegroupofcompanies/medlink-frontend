# Testing API Connection on Mobile

## Quick Test Steps

### 1. Verify Backend is Running
```bash
cd doctor_backend
php artisan serve --host=0.0.0.0 --port=8000
```

You should see:
```
INFO  Server running on [http://0.0.0.0:8000]
```

### 2. Test from Phone Browser
1. Open browser on your phone (same WiFi network)
2. Go to: `http://192.168.0.174:8000/api/test`
3. You should see: `{"message":"API routes working ✅"}`

If this doesn't work, the backend is not accessible from your phone.

### 3. Check Expo Console
When you start the app, look for these logs in Expo console:
```
🔗 API Configuration
═══════════════════════════════════════
📍 Local IP: 192.168.0.174
🔌 API Port: 8000
🌐 API Base URL: http://192.168.0.174:8000/api
📱 Platform: android (or ios)
═══════════════════════════════════════
✅ Mobile IP configured: 192.168.0.174
```

### 4. Check Network Requests
When you try to login/register, you should see in Expo console:
```
📤 POST http://192.168.0.174:8000/api/doctor/login
```

If you see `localhost` instead, the config is not being used correctly.

## Troubleshooting

### Still seeing "localhost" in logs?
1. Stop Expo completely (Ctrl+C)
2. Clear cache: `npx expo start --clear`
3. Restart the app on your phone

### Getting "Network Error"?
1. ✅ Backend running with `--host=0.0.0.0`?
2. ✅ Phone and computer on same WiFi?
3. ✅ Firewall allows port 8000?
4. ✅ Can access `http://192.168.0.174:8000/api/test` in phone browser?

### Getting 401/403 errors?
- Check if backend CORS is configured
- Check if database is connected
- Check Laravel logs: `doctor_backend/storage/logs/laravel.log`

## Common Issues

### Issue: "Cannot connect to server"
**Solution:** 
- Backend must run with `--host=0.0.0.0`
- Test in phone browser first
- Check firewall settings

### Issue: "CORS error"
**Solution:**
- Backend CORS should allow all origins for development
- Check `doctor_backend/bootstrap/app.php` middleware

### Issue: "401 Unauthorized"
**Solution:**
- Check if token is being sent in headers
- Check backend authentication middleware
- Verify database connection

