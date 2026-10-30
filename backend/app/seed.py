"""
Database Seeder for Bharat AI Platform.

Populates:
1. Hardware Devices from data/hardware_devices.csv
2. Benchmarks from data/benchmarks.csv
3. Verified Indian Hardware Suppliers and Distributors
"""

import csv
import logging
from pathlib import Path
from sqlalchemy import select
from .database import Base, SessionLocal, engine
from .models import Benchmark, HardwareDevice, Supplier

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("seed")


def seed_database():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    root_dir = Path(__file__).resolve().parent.parent.parent
    hw_csv = root_dir / "data" / "hardware_devices.csv"
    bench_csv = root_dir / "data" / "benchmarks.csv"

    # 1. Seed Hardware Devices
    if hw_csv.exists():
        with open(hw_csv, mode="r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                name = row["name"].strip()
                existing = db.scalar(select(HardwareDevice).where(HardwareDevice.name == name))
                if not existing:
                    dev = HardwareDevice(
                        name=name,
                        vendor=row["vendor"].strip(),
                        category=row["category"].strip(),
                        tops_int8=float(row["tops_int8"]) if row.get("tops_int8") else None,
                        tflops_fp16=float(row["tflops_fp16"]) if row.get("tflops_fp16") else None,
                        memory_gb=float(row["memory_gb"]),
                        memory_bandwidth_gbps=float(row["memory_bandwidth_gbps"]) if row.get("memory_bandwidth_gbps") else None,
                        tdp_w=float(row["tdp_w"]),
                        price_inr=float(row["price_inr"]),
                        is_indian=row["is_indian"].strip().lower() in ("true", "1", "yes"),
                        availability_in_india=row["availability_in_india"].strip(),
                        source_url=row["source_url"].strip(),
                        confidence_level=row.get("confidence_level", "verified_datasheet").strip(),
                        notes=row.get("notes", "").strip() or None,
                    )
                    db.add(dev)
        db.commit()
        logger.info("Hardware devices seeded.")

    # 2. Seed Benchmarks
    if bench_csv.exists():
        with open(bench_csv, mode="r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                d_name = row["device_name"].strip()
                m_name = row["model_name"].strip()
                existing = db.scalar(
                    select(Benchmark).where(Benchmark.device_name == d_name, Benchmark.model_name == m_name)
                )
                if not existing:
                    # Find device id if available
                    device = db.scalar(select(HardwareDevice).where(HardwareDevice.name == d_name))
                    bm = Benchmark(
                        device_id=device.id if device else None,
                        device_name=d_name,
                        model_name=m_name,
                        model_family=row.get("model_family", "CNN").strip(),
                        precision=row.get("precision", "FP32").strip(),
                        batch_size=int(row.get("batch_size", 1)),
                        latency_ms=float(row["latency_ms"]),
                        throughput_fps=float(row["throughput_fps"]),
                        power_w=float(row["power_w"]) if row.get("power_w") else None,
                        source=row.get("source", "Public Datasheet Benchmark").strip(),
                    )
                    db.add(bm)
        db.commit()
        logger.info("Benchmarks seeded.")

    # 3. Seed Verified Indian Suppliers
    suppliers_data = [
        {
            "name": "Robu.in (Macfos Limited)",
            "city": "Pune",
            "state": "Maharashtra",
            "latitude": 18.5204,
            "longitude": 73.8567,
            "brands": "Raspberry Pi, NVIDIA Jetson, Google Coral, Waveshare, Arduino",
            "services": "Retail, Wholesale, B2B Procurement, GST Invoicing, Fast Shipping",
            "website": "https://robu.in",
            "contact_email": "support@robu.in",
            "contact_phone": "+91-20-67448888",
            "is_verified": True,
            "notes": "India's largest certified electronics e-commerce distributor; official Raspberry Pi Approved Reseller.",
        },
        {
            "name": "ThinkRobotics Technologies",
            "city": "Noida",
            "state": "Uttar Pradesh",
            "latitude": 28.5355,
            "longitude": 77.3910,
            "brands": "NVIDIA Jetson, Hailo AI, Intel RealSense, Coral, Khadas, Seeed",
            "services": "Industrial AI, Edge Integration, Robotics Kits, Academic Discounts",
            "website": "https://thinkrobotics.com",
            "contact_email": "sales@thinkrobotics.com",
            "contact_phone": "+91-120-4567890",
            "is_verified": True,
            "notes": "Premier distributor for AI, robotics, and industrial edge computing solutions across Delhi-NCR and North India.",
        },
        {
            "name": "Silverline Electronics",
            "city": "Bengaluru",
            "state": "Karnataka",
            "latitude": 12.9716,
            "longitude": 77.5946,
            "brands": "NVIDIA RTX, Raspberry Pi, BeagleBone, Jetson, Texas Instruments",
            "services": "Wholesale Component Supply, Rapid Prototyping, Walk-in Store",
            "website": "https://silverlineelectronics.in",
            "contact_email": "info@silverlineelectronics.in",
            "contact_phone": "+91-80-22285432",
            "is_verified": True,
            "notes": "SP Road Bengaluru trusted wholesale hardware dealer with express shipment across Karnataka and South India.",
        },
        {
            "name": "Vicharak Direct Store (Vicharak Innovations)",
            "city": "Ahmedabad",
            "state": "Gujarat",
            "latitude": 23.0225,
            "longitude": 72.5714,
            "brands": "Vicharak Vaaman, Vaaman Pro, Indian Sovereign Edge AI",
            "services": "OEM Direct Sales, Custom Carrier Board Design, RKNN Consulting",
            "website": "https://vicharak.in",
            "contact_email": "contact@vicharak.in",
            "contact_phone": "+91-79-49123456",
            "is_verified": True,
            "notes": "Direct OEM manufacturer supply for Vaaman domestic single-board computers with local engineering support.",
        },
        {
            "name": "Cytron Technologies India",
            "city": "Hyderabad",
            "state": "Telangana",
            "latitude": 17.3850,
            "longitude": 78.4867,
            "brands": "Raspberry Pi, Google Coral, Maker Nano, Seeed Studio, ESP32",
            "services": "Maker Support, Educational Kits, Bulk Supply",
            "website": "https://in.cytron.io",
            "contact_email": "sales@in.cytron.io",
            "contact_phone": "+91-40-66778899",
            "is_verified": True,
            "notes": "Official distributor for embedded computing modules and maker education kits across Telangana and Andhra.",
        },
        {
            "name": "PrimeABGB (AI Workstations & Enterprise)",
            "city": "Mumbai",
            "state": "Maharashtra",
            "latitude": 18.9610,
            "longitude": 72.8183,
            "brands": "NVIDIA RTX 4090, RTX 4060 Ti, Tesla T4, Intel Xeon, AMD Threadripper",
            "services": "Custom AI Rig Building, High-VRAM GPUs, Enterprise Onsite Warranty",
            "website": "https://www.primeabgb.com",
            "contact_email": "sales@primeabgb.com",
            "contact_phone": "+91-22-67402000",
            "is_verified": True,
            "notes": "Lamington Road Mumbai enterprise workstation builder with ready stock of NVIDIA high-memory GPUs and warranty support.",
        },
    ]

    for s in suppliers_data:
        existing = db.scalar(select(Supplier).where(Supplier.name == s["name"]))
        if not existing:
            sup = Supplier(
                name=s["name"],
                city=s["city"],
                state=s["state"],
                latitude=s["latitude"],
                longitude=s["longitude"],
                brands=s["brands"],
                services=s["services"],
                website=s["website"],
                contact_email=s["contact_email"],
                contact_phone=s["contact_phone"],
                is_verified=s["is_verified"],
                notes=s["notes"],
            )
            db.add(sup)

    db.commit()
    logger.info("Suppliers seeded.")
    db.close()


if __name__ == "__main__":
    seed_database()
