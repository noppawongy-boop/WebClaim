/* Excel exporter: one claim per row, all attached images embedded in the Images sheet. */
(() => {
  const button = document.querySelector('#excelBtn');
  if (!button) return;

  const collectImages = value => {
    const output = [];
    const walk = item => {
      if (!item) return;
      if (Array.isArray(item)) return item.forEach(walk);
      if (typeof item === 'string' && item.startsWith('data:image/')) output.push(item);
      else if (typeof item === 'object') walk(item.image || item.src || item.data || item.url);
    };
    walk(value);
    return output;
  };

  const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
  <styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
    <fonts count="2"><font><sz val="10"/><name val="Tahoma"/></font><font><b/><color rgb="FFFFFFFF"/><sz val="10"/><name val="Tahoma"/></font></fonts>
    <fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF17262D"/><bgColor indexed="64"/></patternFill></fill></fills>
    <borders count="1"><border/></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
    <cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/></cellXfs>
    <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
  </styleSheet>`;

  button.onclick = () => {
    const columns = [
      ['วันที่ติดต่อ','contactDate'],['วันที่ซื้อ','purchaseDate'],['ช่องทาง','purchaseChannel'],['รหัสสาขา','branchCode'],
      ['ชื่อสาขา','branchName'],['ชื่อลูกค้า','customerName'],['ประเภทเคลม','claimType'],['สินค้า / รุ่น','product'],
      ['SKU','productSku'],['เลขออเดอร์','orderNumber'],['รายละเอียด','notes'],['รุ่นที่เปลี่ยน','resolvedModel'],
      ['SKU ที่เปลี่ยน','resolvedSku'],['วันที่ส่งคืน','returnDate'],['ขนส่ง','courier'],['Tracking','trackingNumber'],
      ['วิธีการจัดส่งสินค้า','deliveryMethod'],['ผลดำเนินการ','resolutionNotes'],['จำนวนรูปใบเสร็จ','_receiptCount'],['จำนวนรูปปัญหา','_problemCount']
    ];
    const media = [];
    const imageRows = [];
    const rows = claims.map(record => {
      const receipts = collectImages(record.receipt);
      const problems = [...collectImages(record.problemImage), ...collectImages(record.problems)];
      const add = (data, kind, number) => {
        const info = imageInfo(data, `image${media.length + 1}`);
        if (!info) return;
        const ext = info.name.split('.').pop();
        const name = `image${media.length + 1}.${ext}`;
        media.push({name:`xl/media/${name}`, data:info.bytes});
        imageRows.push({record, kind:`${kind} ${number}`, name, mediaIndex:media.length});
      };
      receipts.forEach((data,index) => add(data,'ใบเสร็จ',index + 1));
      problems.forEach((data,index) => add(data,'ภาพปัญหา',index + 1));
      return {...record, _receiptCount:receipts.length, _problemCount:problems.length};
    });

    const groups = [
      ['ทั้งหมด',rows],['หน้าร้าน',rows.filter(x=>channelOf(x)==='หน้าร้าน')],
      ['Shopee',rows.filter(x=>channelOf(x)==='Shopee')],['Lazada',rows.filter(x=>channelOf(x)==='Lazada')],
      ['อื่นๆ',rows.filter(x=>channelOf(x)==='อื่นๆ')]
    ];
    const sheetNames = groups.map(x=>x[0]).concat(['รูปภาพ']);
    const files = [];
    groups.forEach(([name,list],index) => files.push({
      name:`xl/worksheets/sheet${index + 1}.xml`,
      data:sheetXml(columns.map(x=>x[0]),list.map(row=>columns.map(x=>row[x[1]] ?? '')))
    }));

    const imageHeader = ['รหัสรายการ','ลูกค้า','สินค้า','ประเภทรูป','ชื่อไฟล์'];
    const imageBody = `<row r="1" ht="24" customHeight="1">${imageHeader.map((v,i)=>xCell(v,i,1,1)).join('')}</row>` +
      imageRows.map((item,index) => {
        const values=[item.record.id||'',item.record.customerName||'',item.record.product||'',item.kind,item.name];
        return `<row r="${index + 2}" ht="100" customHeight="1">${values.map((v,i)=>xCell(v,i,index + 2)).join('')}</row>`;
      }).join('');
    files.push({name:'xl/worksheets/sheet6.xml',data:`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><cols><col min="1" max="4" width="22" customWidth="1"/><col min="5" max="5" width="24" customWidth="1"/></cols><sheetData>${imageBody}</sheetData>${media.length?'<drawing r:id="rId1"/>':''}</worksheet>`});

    if (media.length) {
      files.push({name:'xl/worksheets/_rels/sheet6.xml.rels',data:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing1.xml"/></Relationships>'});
      const anchors = media.map((item,index) => `<xdr:oneCellAnchor><xdr:from><xdr:col>4</xdr:col><xdr:colOff>50000</xdr:colOff><xdr:row>${index + 1}</xdr:row><xdr:rowOff>50000</xdr:rowOff></xdr:from><xdr:ext cx="1500000" cy="1100000"/><xdr:pic><xdr:nvPicPr><xdr:cNvPr id="${index + 2}" name="${xml(item.name.split('/').pop())}"/><xdr:cNvPicPr><a:picLocks noChangeAspect="1"/></xdr:cNvPicPr></xdr:nvPicPr><xdr:blipFill><a:blip r:embed="rId${index + 1}"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill><xdr:spPr><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr></xdr:pic><xdr:clientData/></xdr:oneCellAnchor>`).join('');
      files.push({name:'xl/drawings/drawing1.xml',data:`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">${anchors}</xdr:wsDr>`});
      files.push({name:'xl/drawings/_rels/drawing1.xml.rels',data:`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${media.map((item,index)=>`<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/${item.name.split('/').pop()}"/>`).join('')}</Relationships>`});
      files.push(...media);
    }

    const workbook=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheetNames.map((name,index)=>`<sheet name="${xml(name)}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`).join('')}</sheets></workbook>`;
    const workbookRels=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheetNames.map((_,index)=>`<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`).join('')}<Relationship Id="rId7" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;
    const contentTypes=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Default Extension="jpg" ContentType="image/jpeg"/><Default Extension="gif" ContentType="image/gif"/><Default Extension="webp" ContentType="image/webp"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${sheetNames.map((_,index)=>`<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${media.length?'<Override PartName="/xl/drawings/drawing1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>':''}</Types>`;
    files.push(
      {name:'[Content_Types].xml',data:contentTypes},
      {name:'_rels/.rels',data:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'},
      {name:'xl/workbook.xml',data:workbook},{name:'xl/_rels/workbook.xml.rels',data:workbookRels},{name:'xl/styles.xml',data:styles}
    );
    const output=makeZip(files);
    download(new Blob([output],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}),`claim-log-${new Date().toLocaleDateString('sv-SE')}.xlsx`);
    toast(`Export Excel: ${rows.length} รายการ และ ${media.length} รูป`);
  };
})();
