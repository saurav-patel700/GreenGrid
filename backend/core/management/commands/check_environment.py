import sys
import os
import django
from django.core.management.base import BaseCommand
from django.db import connection
from django.db.migrations.executor import MigrationExecutor

class Command(BaseCommand):
    help = 'Check environment compatibility, dependencies, database state, and configuration.'

    def handle(self, *args, **options):
        self.stdout.write(self.style.MIGRATE_HEADING("=== GREEN GRID ENVIRONMENT CHECK ==="))
        
        status_counts = {"PASS": 0, "WARN": 0, "FAIL": 0}

        def report(label, condition, message, warning=False):
            if condition:
                self.stdout.write(f"[{self.style.SUCCESS('PASS')}] {label}: {message}")
                status_counts["PASS"] += 1
            elif warning:
                self.stdout.write(f"[{self.style.WARNING('WARN')}] {label}: {message}")
                status_counts["WARN"] += 1
            else:
                self.stdout.write(f"[{self.style.ERROR('FAIL')}] {label}: {message}")
                status_counts["FAIL"] += 1

        # 1. Python Version
        py_ver = sys.version_info
        py_str = f"{py_ver.major}.{py_ver.minor}.{py_ver.micro}"
        report("Python Version", py_ver >= (3, 10), f"Python {py_str}")

        # 2. Django
        report("Django Framework", True, f"Django {django.get_version()}")

        # 3. Django REST Framework
        try:
            import rest_framework
            report("Django REST Framework", True, f"DRF {rest_framework.__version__}")
        except ImportError:
            report("Django REST Framework", False, "rest_framework not installed")

        # 4. Channels
        try:
            import channels
            report("Django Channels", True, f"Channels {channels.__version__}")
        except ImportError:
            report("Django Channels", False, "channels not installed")

        # 5. Daphne
        try:
            import daphne
            report("Daphne ASGI Server", True, f"Daphne {daphne.__version__}")
        except ImportError:
            report("Daphne ASGI Server", False, "daphne not installed")

        # 6. PyMySQL
        try:
            import pymysql
            report("PyMySQL Driver", True, f"PyMySQL {pymysql.__version__}")
        except ImportError:
            report("PyMySQL Driver", False, "pymysql not installed")

        # 7. python-dotenv
        try:
            import dotenv
            report("python-dotenv", True, "python-dotenv available")
        except ImportError:
            report("python-dotenv", False, "python-dotenv not installed")

        # 8. Database Connection
        try:
            connection.ensure_connection()
            db_engine = connection.settings_dict['ENGINE']
            report("Database Connection", True, f"Connected to {db_engine}")
        except Exception as e:
            report("Database Connection", False, f"Failed to connect to database: {str(e)}")

        # 9. Migration State
        try:
            executor = MigrationExecutor(connection)
            targets = executor.loader.graph.leaf_nodes()
            unapplied = executor.migration_plan(targets)
            if len(unapplied) == 0:
                report("Migration State", True, "All database migrations applied cleanly")
            else:
                report("Migration State", False, f"{len(unapplied)} unapplied migrations pending")
        except Exception as e:
            report("Migration State", False, f"Unable to verify migration state: {str(e)}")

        # 10. Required Environment Variables
        required_env = ['SECRET_KEY', 'DEBUG', 'ALLOWED_HOSTS', 'DB_ENGINE']
        missing_env = [env for env in required_env if not os.environ.get(env)]
        if not missing_env:
            report("Environment Variables", True, "All critical environment variables configured")
        else:
            report("Environment Variables", False, f"Missing env variables: {', '.join(missing_env)}")

        self.stdout.write("\n" + self.style.MIGRATE_HEADING("=== SUMMARY ==="))
        self.stdout.write(f"PASS: {status_counts['PASS']} | WARN: {status_counts['WARN']} | FAIL: {status_counts['FAIL']}\n")
        
        if status_counts['FAIL'] > 0:
            self.stderr.write(self.style.ERROR("Environment check completed with failures."))
            sys.exit(1)
        else:
            self.stdout.write(self.style.SUCCESS("Environment check passed successfully."))
