from .database import get_query
import re
from PIL import Image, ImageDraw, ImageFont
from fastapi.responses import StreamingResponse
import io

ROLL_NUMBER_REGEX = r"^\d{2}([A-Z]{3})\d+$"

async def compute_sgpa(semester):
    got_credit , total_credit = 0,0 
    for subject in semester.subjects:
        got_credit += subject.marks
        total_credit += subject.credit
    return got_credit / total_credit if total_credit > 0 else 0.0

async def  get_og_image(roll):
    student_list = await get_query(roll)
    student = student_list["students"]
    if not student or len(student) == 0:
        name , cgpa_val , sgpa_val, branch = "Not Found" , 0.0 , 0.0, "No Branch Found"
        cgpa = f"{cgpa_val:.2f}"
        sgpa = f"{sgpa_val:.2f}"
        return await draw_og_image(name, roll, branch, cgpa, sgpa)
    else:
        student = student[0]
        name = student.student_info.student_name
        roll = roll.upper()
        semesters = student.semesters
        
        cgpa_val, sgpa_val = 0.0 ,0.0
        for semester in semesters:
            sgpa_val = await compute_sgpa(semester)
            cgpa_val += sgpa_val
        cgpa_val = cgpa_val / len(semesters) if len(semesters) > 0 else 0.0
        cgpa = f"{cgpa_val:.2f}"
        sgpa = f"{sgpa_val:.2f}"

        branch_map = {
            "BAR": "Architecture", "BCE": "Civil Engineering", "BCH": "Chemical Engineering",
            "BEC": "Electronics & Comm", "BEE": "Electrical Engineering",
            "BMA": "Mathematics & Computing", "BME": "Mechanical Engineering",
            "BMS": "Material Science", "BPH": "Engineering Physics",
            "DCS": "Dual Degree CSE", "BCS": "Computer Science", "DEC": "Dual Degree ECE"
        }
        match = re.match(ROLL_NUMBER_REGEX, roll)
        if match:
            branch_code = match.group(1)
        else:
            branch_code = "UNK"
        branch = branch_map.get(branch_code, "Engineering Program")
        return await draw_og_image(name, roll , branch, cgpa, sgpa)
    

async def draw_og_image(name , roll_no, branch,cgpa, sgpa):
    img = Image.new("RGBA", (1200, 630), "#101412")
    draw = ImageDraw.Draw(img)

    from pathlib import Path
    backend_dir = Path(__file__).resolve().parent.parent
    font_bold = str(backend_dir / "assets" / "Outfit-Bold.ttf")
    font_medium = str(backend_dir / "assets" / "Outfit-Medium.ttf")
    font_regular = str(backend_dir / "assets" / "Outfit-Regular.ttf")

    name_len = len(name)
    if name_len > 25:
        title_size = 38
    elif name_len > 18:
        title_size = 48
    else:
        title_size = 60

    try:
        title_font = ImageFont.truetype(font_bold, title_size)
        subtitle_font = ImageFont.truetype(font_medium, 32)
        label_font = ImageFont.truetype(font_regular, 20)
        score_font = ImageFont.truetype(font_bold, 80)
    except IOError:
        try:
            font_dejavu_bold = str(backend_dir / "assets" / "DejaVuSans-Bold.ttf")
            font_dejavu_regular = str(backend_dir / "assets" / "DejaVuSans.ttf")
            title_font = ImageFont.truetype(font_dejavu_bold, title_size)
            subtitle_font = ImageFont.truetype(font_dejavu_regular, 32)
            label_font = ImageFont.truetype(font_dejavu_regular, 20)
            score_font = ImageFont.truetype(font_dejavu_bold, 80)
        except IOError:
            title_font = ImageFont.load_default()
            subtitle_font = ImageFont.load_default()
            label_font = ImageFont.load_default()
            score_font = ImageFont.load_default()

    draw.text((80, 80), "NITH RESULTS", fill="#8ceba8", font=subtitle_font)
    draw.text((80, 155), name.upper(), fill="#ffffff", font=title_font)
    draw.text((80, 240), f"{roll_no}  •  {branch}", fill="#a4adab", font=subtitle_font)
    
    draw.rectangle([80, 340, 450, 520], fill="#1c221e", outline="#232a26", width=2)
    draw.text((110, 365), "CUMULATIVE CGPA", fill="#a4adab", font=label_font)
    draw.text((110, 405), cgpa, fill="#8ceba8", font=score_font)
    
    draw.rectangle([490, 340, 860, 520], fill="#1c221e", outline="#232a26", width=2)
    draw.text((520, 365), "LATEST SEMESTER SGPA", fill="#a4adab", font=label_font)
    draw.text((520, 405), sgpa, fill="#95c5c6", font=score_font)

    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    
    return StreamingResponse(buf, media_type="image/png")