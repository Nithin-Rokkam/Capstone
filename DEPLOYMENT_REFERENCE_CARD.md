# Deployment Reference Card

## 🚀 Quick Commands

### Installation
```bash
pip install ansible
```

### Configuration
```bash
cd ansible
cp /path/to/newsrec.pem .
chmod 600 newsrec.pem
# Edit inventory.ini: replace YOUR_EC2_IP with your EC2 IP
```

### Deployment
```bash
# Windows (PowerShell)
.\deploy.ps1

# Linux/Mac (Bash)
chmod +x deploy.sh
./deploy.sh

# Manual (Any OS)
ansible-playbook deploy.yml -i inventory.ini -e "newsapi_api_key=YOUR_KEY"
```

### Verification
```bash
curl http://YOUR_EC2_IP/api/health
open http://YOUR_EC2_IP/docs
```

---

## 🔧 SSH Commands

### Connect
```bash
ssh -i ansible/newsrec.pem ec2-user@YOUR_EC2_IP
```

### View Logs
```bash
ssh -i ansible/newsrec.pem ec2-user@YOUR_EC2_IP sudo tail -f /var/log/news-recommender-api.log
```

### Check Status
```bash
ssh -i ansible/newsrec.pem ec2-user@YOUR_EC2_IP sudo supervisorctl status
```

### Restart App
```bash
ssh -i ansible/newsrec.pem ec2-user@YOUR_EC2_IP sudo supervisorctl restart news-recommender-api
```

### Update App
```bash
ssh -i ansible/newsrec.pem ec2-user@YOUR_EC2_IP
cd /home/newsrec/news-recommender-api
git pull origin main
source venv/bin/activate
pip install -r requirements.txt
sudo supervisorctl restart news-recommender-api
```

---

## 📁 Important Paths (on EC2)

| Path | Purpose |
|------|---------|
| `/home/newsrec/news-recommender-api/` | Application directory |
| `/home/newsrec/news-recommender-api/venv/` | Python virtual environment |
| `/home/newsrec/news-recommender-api/data/` | MIND dataset |
| `/home/newsrec/news-recommender-api/.env` | Environment variables |
| `/var/log/news-recommender-api.log` | Application logs |
| `/var/log/nginx/` | Nginx logs |
| `/etc/supervisor/conf.d/news-recommender-api.conf` | Supervisor config |
| `/etc/nginx/sites-available/news-recommender-api` | Nginx config |

---

## 🔍 Troubleshooting Commands

### Test SSH
```bash
ssh -i ansible/newsrec.pem -v ec2-user@YOUR_EC2_IP
```

### Test Ansible
```bash
cd ansible
ansible all -i inventory.ini -m ping
```

### Check Application
```bash
ssh -i ansible/newsrec.pem ec2-user@YOUR_EC2_IP
sudo supervisorctl status
sudo tail -f /var/log/news-recommender-api.log
```

### Check Nginx
```bash
ssh -i ansible/newsrec.pem ec2-user@YOUR_EC2_IP
sudo systemctl status nginx
sudo tail -f /var/log/nginx/news-recommender-error.log
```

### Check System Resources
```bash
ssh -i ansible/newsrec.pem ec2-user@YOUR_EC2_IP
df -h          # Disk usage
free -h        # Memory usage
top            # CPU usage
```

---

## 📚 Documentation Files

| File | Purpose | Read Time |
|------|---------|-----------|
| `QUICK_START_ANSIBLE.md` | Quick start guide | 5 min |
| `ANSIBLE_DEPLOYMENT_GUIDE.md` | Detailed guide | 15 min |
| `DEPLOYMENT_CHECKLIST.md` | Step-by-step checklist | 10 min |
| `ANSIBLE_ARCHITECTURE.md` | System architecture | 10 min |
| `ansible/README.md` | Ansible documentation | 20 min |
| `DEPLOYMENT_SUMMARY.md` | Deployment overview | 5 min |

---

## ✅ Pre-Deployment Checklist

- [ ] AWS EC2 instance created
- [ ] EC2 public IP noted
- [ ] PEM key downloaded
- [ ] Security group allows ports 22, 80, 443
- [ ] Ansible installed
- [ ] SSH client available
- [ ] PEM key copied to `ansible/` directory
- [ ] `inventory.ini` updated with EC2 IP

---

## 🎯 Deployment Workflow

```
1. Install Ansible
   ↓
2. Copy PEM key to ansible/
   ↓
3. Update inventory.ini with EC2 IP
   ↓
4. Run deploy.sh / deploy.ps1
   ↓
5. Wait for completion (~1-2 minutes)
   ↓
6. Verify: curl http://YOUR_EC2_IP/api/health
   ↓
7. Access docs: http://YOUR_EC2_IP/docs
   ↓
✅ Deployment Complete!
```

---

## 🔐 Security Reminders

- Keep `newsrec.pem` secure
- Never commit PEM key to Git
- Restrict SSH to your IP in security group
- Store API key in `.env` file
- Use HTTPS in production
- Keep packages updated

---

## 📊 Key Information

| Item | Value |
|------|-------|
| App User | `newsrec` |
| App Directory | `/home/newsrec/news-recommender-api/` |
| API Port (Internal) | 8000 |
| Web Port (External) | 80 |
| Workers | 4 |
| Log File | `/var/log/news-recommender-api.log` |
| Health Endpoint | `/api/health` |
| Docs Endpoint | `/docs` |

---

## 🆘 Quick Troubleshooting

| Problem | Solution |
|---------|----------|
| SSH connection failed | Check EC2 IP, security group, PEM permissions |
| Ansible connectivity failed | Run `ansible all -i inventory.ini -m ping` |
| API not responding | Check logs: `sudo tail -f /var/log/news-recommender-api.log` |
| Application crashed | Restart: `sudo supervisorctl restart news-recommender-api` |
| Nginx error | Check: `sudo systemctl status nginx` |
| Disk full | Check: `df -h` and clean up old logs |

---

## 📞 Getting Help

1. Check relevant documentation file
2. Review troubleshooting section
3. Check application logs
4. Verify EC2 configuration
5. Test endpoints manually

---

## 🎉 Success Indicators

✅ SSH connection works
✅ Ansible connectivity works
✅ Deployment completes without errors
✅ API health check returns 200
✅ API docs accessible
✅ Search endpoint returns results
✅ Application logs show no errors

---

## 🚀 Common Next Steps

1. Set up SSL/TLS certificate
2. Deploy frontend to Vercel
3. Configure monitoring
4. Set up backups
5. Add custom domain
6. Enable auto-scaling

---

**Print this card for quick reference during deployment!**
